import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { generateCampaignReply } from "@/lib/campaign-langchain";

/** Send a real WhatsApp reply via the backend */
async function sendWhatsAppReply(phone: string, message: string) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const res = await fetch(`${backendUrl}/api/whatsapp/send-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "WhatsApp send failed");
    return data;
  } catch (err) {
    console.error("⚠️ WhatsApp reply failed (non-fatal):", err);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string; contactId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { campaignId, contactId } = await params;
    const { message } = await request.json();

    const contactRef = db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .doc(campaignId)
      .collection("inbox")
      .doc("contacts")
      .collection("contacts")
      .doc(contactId);

    // Fetch contact document to get phone number for real WhatsApp
    const contactSnap = await contactRef.get();
    const contactData = contactSnap.exists ? contactSnap.data() : null;
    const contactPhone: string = contactData?.contactPhone || "";

    // Save USER message
    const userMsgId = `user_${Date.now()}`;
    await contactRef.collection("messages").doc(userMsgId).set({
      sender: "user",
      content: message,
      timestamp: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // Generate AI response (WAIT for it to complete)
    const aiReply = await generateCampaignReply({
      userId,
      campaignId,
      contactId,
      message,
    });

    // Save AI reply to Firestore
    const aiMsgId = `ai_${Date.now()}`;
    await contactRef.collection("messages").doc(aiMsgId).set({
      sender: "ai",
      content: aiReply,
      timestamp: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // ── Send AI reply via real WhatsApp ───────────────────────────────────────
    if (contactPhone) {
      await sendWhatsAppReply(contactPhone, aiReply);
      console.log(`📱 WhatsApp reply sent to ${contactPhone}`);
    } else {
      console.warn(`⚠️  No phone for contactId ${contactId}, skipping WhatsApp`);
    }

    return NextResponse.json({
      success: true,
      messageId: userMsgId,
      aiReply: aiReply,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
