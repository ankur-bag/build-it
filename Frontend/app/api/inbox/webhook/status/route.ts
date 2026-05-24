import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";

/**
 * POST /api/inbox/webhook/status
 * 
 * Called by backend when message delivery status changes.
 * Updates the message status in Firestore.
 * 
 * Body:
 * {
 *   campaignId: string,
 *   toPhone: string,
 *   messageId: string,
 *   status: 'sent' | 'delivered' | 'read' | 'failed',
 *   timestamp: ISO string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      campaignId,
      contactId,
      toPhone,
      messageId,
      status,
      timestamp,
      errorMessage,
    } = body;

    console.log("📊 Webhook: Updating message status");
    console.log(`   Campaign: ${campaignId}`);
    console.log(`   Contact: ${contactId}`);
    console.log(`   To: ${toPhone}`);
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Status: ${status}`);

    // Validate required fields
    if (!campaignId || !messageId || !status) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the user who owns this campaign if not provided
    let ownerUserId = userId;

    if (!ownerUserId && campaignId) {
      // Try to find the user by looking up the campaign
      const campaignsSnapshot = await db
        .collectionGroup("campaigns")
        .where("__name__", "==", campaignId)
        .limit(1)
        .get();

      if (campaignsSnapshot.docs.length > 0) {
        const campaignRef = campaignsSnapshot.docs[0].ref;
        const pathParts = campaignRef.path.split("/");
        ownerUserId = pathParts[1];
      }
    }

    if (!ownerUserId) {
      console.error("❌ Could not determine campaign owner");
      return NextResponse.json(
        { error: "Could not find campaign owner" },
        { status: 404 }
      );
    }

    // Try to find the message by WhatsApp message ID
    const campaignRef = db
      .collection("users")
      .doc(ownerUserId)
      .collection("campaigns")
      .doc(campaignId);

    // Update message status - search by whatsappMessageId
    let updated = false;

    if (contactId) {
      // Direct update if contactId provided
      const messagesRef = campaignRef
        .collection("inbox")
        .doc("contacts")
        .collection("contacts")
        .doc(contactId)
        .collection("messages");

      const snapshot = await messagesRef
        .where("whatsappMessageId", "==", messageId)
        .limit(1)
        .get();

      if (snapshot.docs.length > 0) {
        const msgDoc = snapshot.docs[0];
        await msgDoc.ref.update({
          status,
          deliveryStatus: status,
          lastStatusUpdate: new Date(timestamp).toISOString(),
          errorMessage: errorMessage || null,
        });
        updated = true;
        console.log(`✅ Message status updated: ${msgDoc.id}`);
      }
    }

    if (!updated && toPhone) {
      // Fallback: search all contacts by phone number
      const contactsSnapshot = await campaignRef
        .collection("inbox")
        .doc("contacts")
        .collection("contacts")
        .where("contactPhone", "==", toPhone)
        .get();

      for (const contactDoc of contactsSnapshot.docs) {
        const messagesRef = contactDoc.ref.collection("messages");
        const msgSnapshot = await messagesRef
          .where("whatsappMessageId", "==", messageId)
          .limit(1)
          .get();

        if (msgSnapshot.docs.length > 0) {
          await msgSnapshot.docs[0].ref.update({
            status,
            deliveryStatus: status,
            lastStatusUpdate: new Date(timestamp).toISOString(),
            errorMessage: errorMessage || null,
          });
          updated = true;
          console.log(`✅ Message status updated via phone lookup`);
          break;
        }
      }
    }

    if (!updated) {
      console.warn(`⚠️ Message not found for status update: ${messageId}`);
      return NextResponse.json({
        success: false,
        message: "Message not found, but status acknowledged",
      });
    }

    return NextResponse.json({
      success: true,
      messageId,
      status,
    });
  } catch (error) {
    console.error("❌ Error updating message status:", error);
    return NextResponse.json(
      { error: "Failed to update message status" },
      { status: 500 }
    );
  }
}
