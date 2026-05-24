import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { generateCampaignReply } from "@/lib/campaign-langchain";

/**
 * POST /api/inbox/[campaignId]/[contactId]/send-whatsapp
 * 
 * Send a user message via WhatsApp to a contact.
 * This is called from the inbox when a user replies to a message.
 * 
 * Body:
 * {
 *   message: string,
 *   type?: 'text' | 'audio' | 'image' (default: 'text')
 *   mediaUrl?: string (for non-text messages)
 * }
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ campaignId: string; contactId: string }> }
) {
  try {
    const { campaignId, contactId } = await props.params;
    const body = await request.json();
    const { message, type = 'text', mediaUrl } = body;

    console.log("📤 Sending WhatsApp message");
    console.log(`   Campaign: ${campaignId}`);
    console.log(`   Contact: ${contactId}`);
    console.log(`   Type: ${type}`);

    if (!message && !mediaUrl) {
      return NextResponse.json(
        { error: "Message or media URL required" },
        { status: 400 }
      );
    }

    // Get contact phone number from Firestore
    // This is a bit tricky since we need to find which user owns this campaign
    const allUsersSnapshot = await db.collection("users").get();
    let contactPhone = null;
    let ownerUserId = null;

    for (const userDoc of allUsersSnapshot.docs) {
      const campaignRef = userDoc.ref
        .collection("campaigns")
        .doc(campaignId);

      const campaignSnap = await campaignRef.get();
      if (campaignSnap.exists) {
        ownerUserId = userDoc.id;

        // Get contact phone from inbox
        const contactRef = campaignRef
          .collection("inbox")
          .doc("contacts")
          .collection("contacts")
          .doc(contactId);

        const contactSnap = await contactRef.get();
        if (contactSnap.exists) {
          contactPhone = contactSnap.data()?.contactPhone || null;
        }
        break;
      }
    }

    if (!contactPhone) {
      console.error("❌ Could not find contact phone number");
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    console.log(`📞 Found contact phone: ${contactPhone}`);

    // Send message via WhatsApp backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

    try {
      const waRes = await fetch(`${backendUrl}/api/whatsapp/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: contactPhone,
          type,
          content: message,
          url: mediaUrl,
        }),
      });

      if (!waRes.ok) {
        const error = await waRes.json();
        throw new Error(error.error || 'Failed to send message');
      }

      const waData = await waRes.json();
      const whatsappMessageId = waData.messageId;

      console.log(`✅ Message sent, WhatsApp ID: ${whatsappMessageId}`);

      // Store message in Firestore inbox
      if (ownerUserId) {
        const messageRef = db
          .collection("users")
          .doc(ownerUserId)
          .collection("campaigns")
          .doc(campaignId)
          .collection("inbox")
          .doc("contacts")
          .collection("contacts")
          .doc(contactId)
          .collection("messages")
          .doc();

        await messageRef.set({
          id: messageRef.id,
          sender: "user",
          type,
          content: message,
          mediaUrl: mediaUrl || null,
          whatsappMessageId,
          contactPhone,
          timestamp: new Date().toISOString(),
          status: "sent",
          createdAt: FieldValue.serverTimestamp(),
        });

        console.log(`✅ Message stored in inbox`);

        // Update contact's lastMessage
        const contactRef = db
          .collection("users")
          .doc(ownerUserId)
          .collection("campaigns")
          .doc(campaignId)
          .collection("inbox")
          .doc("contacts")
          .collection("contacts")
          .doc(contactId);

        await contactRef.update({
          lastMessage: message,
          lastMessageTime: FieldValue.serverTimestamp(),
        });

        console.log(`✅ Contact updated`);

        // Generate AI response
        console.log(`🤖 Generating AI response for message: "${message}"`);
        try {
          console.log(`   userId: ${ownerUserId}`);
          console.log(`   campaignId: ${campaignId}`);
          console.log(`   contactId: ${contactId}`);
          
          const aiReply = await generateCampaignReply({
            userId: ownerUserId,
            campaignId,
            contactId,
            message,
          });

          if (!aiReply || aiReply.trim().length === 0) {
            console.warn(`⚠️ AI generated empty response`);
          } else {
            console.log(`✅ AI response generated (${aiReply.length} chars): "${aiReply.substring(0, 100)}..."`);

            // Send AI response back via WhatsApp
            console.log(`📤 Sending AI response via WhatsApp...`);
            const aiRes = await fetch(`${backendUrl}/api/whatsapp/send-message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: contactPhone,
                type: 'text',
                content: aiReply,
              }),
            });

            if (!aiRes.ok) {
              const errorText = await aiRes.text();
              console.error(`❌ WhatsApp API error: ${aiRes.status} - ${errorText}`);
              console.warn(`⚠️ Failed to send AI response via WhatsApp`);
            } else {
              const aiData = await aiRes.json();
              const aiMsgId = aiData.messageId;

              console.log(`✅ AI response sent via WhatsApp, ID: ${aiMsgId}`);

              // Store AI response in inbox
              const aiMsgRef = db
                .collection("users")
                .doc(ownerUserId)
                .collection("campaigns")
                .doc(campaignId)
                .collection("inbox")
                .doc("contacts")
                .collection("contacts")
                .doc(contactId)
                .collection("messages")
                .doc();

              await aiMsgRef.set({
                id: aiMsgRef.id,
                sender: "campaign",
                type: "text",
                content: aiReply,
                whatsappMessageId: aiMsgId,
                contactPhone,
                timestamp: new Date().toISOString(),
                status: "sent",
                createdAt: FieldValue.serverTimestamp(),
              });

              console.log(`✅ AI response stored in inbox`);
            }
          }
        } catch (aiError) {
          console.error(`❌ Error generating/sending AI response:`, aiError instanceof Error ? aiError.message : String(aiError));
          if (aiError instanceof Error && aiError.stack) {
            console.error(`   Stack:`, aiError.stack);
          }
          // Don't fail the entire request if AI response fails
        }
      }

      return NextResponse.json({
        success: true,
        messageId: whatsappMessageId,
      });
    } catch (waError) {
      console.error("❌ WhatsApp send error:", waError);
      return NextResponse.json(
        { error: waError instanceof Error ? waError.message : 'Failed to send message' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Error sending message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
