import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Normalize phone number to consistent format (digits only with country code)
 */
function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  let digits = String(raw).replace(/\\D/g, '');
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  return digits;
}

/**
 * POST /api/inbox/webhook/track-sent
 * 
 * Called by backend after sending campaign messages to track WhatsApp message IDs.
 * This allows us to correlate delivery status updates with specific messages.
 * 
 * Body:
 * {
 *   userId: string,
 *   campaignId: string,
 *   contactId: string,
 *   phone: string,
 *   messageType: 'text' | 'audio' | 'image' | 'document',
 *   messageId: string (WhatsApp message ID),
 *   content: string,
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
      phone,
      messageType,
      messageId,
      content,
      timestamp,
    } = body;

    // Normalize phone number for consistent matching
    const normalizedPhone = normalizePhoneNumber(phone);

    console.log("📤 Webhook: Tracking sent message");
    console.log(`   Campaign: ${campaignId}`);
    console.log(`   Contact: ${contactId}`);
    console.log(`   Phone: ${phone} → ${normalizedPhone}`);
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Type: ${messageType}`);

    // Validate required fields
    if (!campaignId || !contactId || !messageId) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields: campaignId, contactId, messageId" },
        { status: 400 }
      );
    }

    const ownerUserId = userId || campaignId.split("_")[0];

    // Store sent message with campaign-level tracking
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
      sender: "campaign",
      type: messageType,
      content,
      whatsappMessageId: messageId,
      contactPhone: normalizedPhone,
      timestamp: new Date(timestamp).toISOString(),
      status: "sent",
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Sent message tracked: ${messageRef.id}`);

    // Also store message tracking at campaign level for quick lookups
    const trackingRef = db
      .collection("users")
      .doc(ownerUserId)
      .collection("campaigns")
      .doc(campaignId)
      .collection("messageTracking")
      .doc(messageId);

    await trackingRef.set({
      whatsappMessageId: messageId,
      contactPhone: normalizedPhone,
      contactId,
      messageType,
      sentAt: new Date(timestamp).toISOString(),
      status: "sent",
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Message tracking stored for lookups`);

    return NextResponse.json({
      success: true,
      messageId: messageRef.id,
    });
  } catch (error) {
    console.error("❌ Error tracking sent message:", error);
    return NextResponse.json(
      { error: "Failed to track sent message" },
      { status: 500 }
    );
  }
}
