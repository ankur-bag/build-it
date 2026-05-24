import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/inbox/webhook/message
 * 
 * Called by backend when an incoming message is received via WhatsApp.
 * Stores the message in Firestore for the inbox to display.
 * 
 * Body:
 * {
 *   campaignId: string,
 *   contactId: string,
 *   fromPhone: string,
 *   type: 'text' | 'audio' | 'image' | 'document',
 *   content: string,
 *   mediaUrl?: string,
 *   messageId: string,
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
      fromPhone,
      type,
      content,
      mediaUrl,
      messageId,
      timestamp,
    } = body;

    console.log("📨 Webhook: Storing incoming message");
    console.log(`   Campaign: ${campaignId}`);
    console.log(`   Contact: ${contactId}`);
    console.log(`   From: ${fromPhone}`);
    console.log(`   Type: ${type}`);

    // Validate required fields
    if (!campaignId || !contactId) {
      console.error("❌ Missing campaignId or contactId");
      return NextResponse.json(
        { error: "Missing campaignId or contactId" },
        { status: 400 }
      );
    }

    // Find the user who owns this campaign
    let ownerUserId = userId;

    if (!ownerUserId) {
      // Try to find the user by looking up the campaign
      const campaignsSnapshot = await db.collectionGroup("campaigns").where("__name__", "==", campaignId).limit(1).get();
      if (campaignsSnapshot.docs.length > 0) {
        const campaignRef = campaignsSnapshot.docs[0].ref;
        const pathParts = campaignRef.path.split("/");
        ownerUserId = pathParts[1]; // Extract userId from path: users/{userId}/campaigns/{campaignId}
      }
    }

    if (!ownerUserId) {
      console.error("❌ Could not determine campaign owner");
      return NextResponse.json(
        { error: "Could not find campaign owner" },
        { status: 404 }
      );
    }

    // Store message in Firestore
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
      sender: "contact",
      type,
      content,
      mediaUrl: mediaUrl || null,
      whatsappMessageId: messageId,
      contactPhone: fromPhone,
      timestamp: new Date(timestamp).toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Message stored: ${messageRef.id}`);

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
      lastMessage: content,
      lastMessageTime: FieldValue.serverTimestamp(),
      unreadCount: FieldValue.increment(1),
    });

    console.log(`✅ Contact updated with last message`);

    return NextResponse.json({
      success: true,
      messageId: messageRef.id,
    });
  } catch (error) {
    console.error("❌ Error storing message:", error);
    return NextResponse.json(
      { error: "Failed to store message" },
      { status: 500 }
    );
  }
}
