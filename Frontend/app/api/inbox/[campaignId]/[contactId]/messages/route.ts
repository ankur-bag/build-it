import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase/admin";

async function generateCampaignMessages(userId: string, campaignId: string) {
  try {
    const campaignDoc = await db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .doc(campaignId)
      .get();

    if (!campaignDoc.exists) {
      return [];
    }

    const campaignData = campaignDoc.data() as any;
    const messages = [];
    let messageIndex = 0;

    // Generate campaign title message (first)
    if (campaignData.title) {
      messages.push({
        id: `msg_${messageIndex}_title`,
        sender: "campaign",
        type: "text",
        content: campaignData.title,
        timestamp: new Date(Date.now() - 10000).toISOString(),
        audioUrl: undefined,
        assets: undefined,
      });
      messageIndex++;
    }

    // Generate preview message (second)
    if (campaignData.previewText || campaignData.description) {
      const descText = typeof campaignData.description === "string" 
        ? campaignData.description 
        : campaignData.description?.aiEnhanced || campaignData.description?.original || "";
      
      messages.push({
        id: `msg_${messageIndex}_preview`,
        sender: "campaign",
        type: "text",
        content: campaignData.previewText || descText || "",
        timestamp: new Date(Date.now() - 7500).toISOString(),
        audioUrl: undefined,
        assets: undefined,
      });
      messageIndex++;
    }

    // Generate audio message (third)
    if (campaignData.audioUrls?.voice) {
      messages.push({
        id: `msg_${messageIndex}_audio`,
        sender: "campaign",
        type: "audio",
        content: "Voice message",
        timestamp: new Date(Date.now() - 5000).toISOString(),
        audioUrl: campaignData.audioUrls.voice,
        assets: undefined,
      });
      messageIndex++;
    }

    // Generate assets message (fourth)
    if (campaignData.assets?.length > 0) {
      messages.push({
        id: `msg_${messageIndex}_assets`,
        sender: "campaign",
        type: "text",
        content: `📎 ${campaignData.assets.length} file(s)`,
        timestamp: new Date(Date.now() - 2500).toISOString(),
        audioUrl: undefined,
        assets: campaignData.assets,
      });
      messageIndex++;
    }

    console.log(`📝 Generated ${messages.length} campaign messages in order: title, preview, audio, assets`);
    return messages;
  } catch (error: any) {
    console.error(`❌ Error generating campaign messages:`, error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string; contactId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId, contactId } = await params;

    console.log(`📨 Fetching messages for contact ${contactId} in campaign ${campaignId}`);

    // Get messages from Firestore
    const messagesRef = db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .doc(campaignId)
      .collection("inbox")
      .doc("contacts")
      .collection("contacts")
      .doc(contactId)
      .collection("messages");

    let messagesSnapshot;
    try {
      messagesSnapshot = await messagesRef
        .orderBy("timestamp", "asc")
        .get();
      console.log(`✅ Found ${messagesSnapshot.docs.length} messages using timestamp ordering`);
    } catch (orderByError) {
      console.log(`⚠️ OrderBy failed, falling back to manual sort:`, (orderByError as any).message);
      // Fallback: get all and sort in code
      const allDocs = await messagesRef.get();
      console.log(`📦 Retrieved ${allDocs.docs.length} total messages without ordering`);
      const sortedDocs = allDocs.docs.sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        // Try timestamp first, then createdAt, then fallback to 0
        const aTime = aData.timestamp || aData.createdAt?.toDate?.() || new Date(aData.createdAt || 0);
        const bTime = bData.timestamp || bData.createdAt?.toDate?.() || new Date(bData.createdAt || 0);
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      });
      messagesSnapshot = { docs: sortedDocs };
    }

    const firestoreMessages = messagesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        sender: data.sender || "user",
        type: data.type || "text",
        content: data.content || "",
        timestamp: data.timestamp || new Date().toISOString(),
        audioUrl: data.audioUrl,
        assets: data.assets,
      };
    });

    console.log(`📊 Returning ${firestoreMessages.length} messages`);
    return NextResponse.json({ messages: firestoreMessages });
  } catch (error) {
    console.error(`❌ Error fetching messages:`, error);
    return NextResponse.json({ messages: [], error: (error as any).message });
  }
}
