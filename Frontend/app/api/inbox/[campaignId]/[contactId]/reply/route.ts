import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase/admin";
import { generateCampaignReply } from "@/lib/campaign-langchain";
import { saveChatHistory } from "@/lib/campaign-langchain";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/inbox/[campaignId]/[contactId]/reply
 * 
 * INBOX-ONLY endpoint that generates AI responses LOCALLY using Gemini.
 * NO backend calls, NO WhatsApp integration.
 * 
 * This is different from /send which sends via WhatsApp backend.
 * 
 * Body: { message: string }
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ campaignId: string; contactId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { campaignId, contactId } = await props.params;
    const { message } = await request.json();

    console.log(`📨 INBOX REPLY (local Gemini, no backend)`);
    console.log(`   User: ${userId}`);
    console.log(`   Campaign: ${campaignId}`);
    console.log(`   Contact: ${contactId}`);
    console.log(`   Message: ${message.substring(0, 50)}...`);

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message required" },
        { status: 400 }
      );
    }

    const contactRef = db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .doc(campaignId)
      .collection("inbox")
      .doc("contacts")
      .collection("contacts")
      .doc(contactId);

    // ✅ Step 1: Save USER message to Firestore
    const userMsgId = `user_${Date.now()}`;
    await contactRef.collection("messages").doc(userMsgId).set({
      id: userMsgId,
      sender: "user",
      type: "text",
      content: message,
      timestamp: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ User message saved: ${userMsgId}`);

    // ✅ Step 2: Generate AI response using ONLY Gemini (local, no backend)
    console.log(`🤖 Calling generateCampaignReply (Gemini only)...`);
    const aiReply = await generateCampaignReply({
      userId,
      campaignId,
      contactId,
      message,
    });

    console.log(`✅ AI reply generated: ${aiReply.substring(0, 50)}...`);

    // ✅ Step 3: Save AI response to Firestore
    const aiMsgId = `ai_${Date.now()}`;
    await contactRef.collection("messages").doc(aiMsgId).set({
      id: aiMsgId,
      sender: "ai",
      type: "text",
      content: aiReply,
      timestamp: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ AI message saved: ${aiMsgId}`);

    // ✅ Step 4: Update contact's last message
    await contactRef.update({
      lastMessage: aiReply,
      lastMessageTime: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Contact updated`);
    console.log(`✅ INBOX REPLY COMPLETE - No backend, No WhatsApp`);

    return NextResponse.json({
      success: true,
      messageId: userMsgId,
      aiReply,
    });
  } catch (error) {
    console.error("❌ Inbox reply error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process" },
      { status: 500 }
    );
  }
}
