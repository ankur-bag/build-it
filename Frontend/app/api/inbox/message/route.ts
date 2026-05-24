import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { auth } from "@clerk/nextjs/server";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const contactId = searchParams.get("contactId");

    // Get all responses for a specific contact in a campaign
    if (campaignId && contactId) {
      const responsesSnapshot = await db
        .collection("useCampaignResponse")
        .where("userId", "==", userId)
        .where("campaignId", "==", campaignId)
        .where("contactId", "==", contactId)
        .orderBy("createdAt", "asc")
        .get();

      const responses = responsesSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      }));

      return NextResponse.json({ responses }, { status: 200 });
    }

    // Get campaign with all its contacts
    if (campaignId) {
      const campaignSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("campaigns")
        .doc(campaignId)
        .get();

      if (!campaignSnapshot.exists) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 }
        );
      }

      const campaignData = campaignSnapshot.data();

      // Get all contacts for this campaign
      const contactsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("campaigns")
        .doc(campaignId)
        .collection("contacts")
        .get();

      const contacts = contactsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      }));

      return NextResponse.json(
        { campaign: campaignData, contacts },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Missing campaignId parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Inbox GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, contactId, messageContent, contactName, sentBy } = body;

    if (!campaignId || !contactId || !messageContent) {
      return NextResponse.json(
        {
          error: "Missing required fields: campaignId, contactId, messageContent",
        },
        { status: 400 }
      );
    }

    // Save user message to useCampaignResponse collection
    const userMessageRef = await db.collection("useCampaignResponse").add({
      userId,
      campaignId,
      contactId,
      contactName: contactName || "Unknown",
      messageContent,
      sentBy: sentBy || "user",
      messageType: "text",
      status: "sent",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const userMessageId = userMessageRef.id;

    // Simulate AI response (you can integrate with actual AI API here)
    const aiResponse = `Thank you for your message. We received: "${messageContent}". Will get back to you soon!`;

    const aiMessageRef = await db.collection("useCampaignResponse").add({
      userId,
      campaignId,
      contactId,
      contactName: contactName || "Unknown",
      messageContent: aiResponse,
      sentBy: "ai",
      messageType: "text",
      status: "delivered",
      sentiment: "neutral",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const aiMessageId = aiMessageRef.id;

    return NextResponse.json(
      {
        success: true,
        userMessage: {
          id: userMessageId,
          messageContent,
          sentBy: "user",
          createdAt: new Date(),
        },
        aiMessage: {
          id: aiMessageId,
          messageContent: aiResponse,
          sentBy: "ai",
          createdAt: new Date(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Message POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save message" },
      { status: 500 }
    );
  }
}
