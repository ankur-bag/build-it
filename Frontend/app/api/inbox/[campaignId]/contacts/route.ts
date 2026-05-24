import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId } = await params;
    console.log(`📬 Fetching contacts for campaign: ${campaignId}`);

    // Get campaign data to access contactsSummary
    const campaignDoc = await db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .doc(campaignId)
      .get();

    if (!campaignDoc.exists) {
      return NextResponse.json(
        { error: "Campaign not found", contacts: [] },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data() as any;
    
    // Get contacts from campaign's contactsSummary (source of truth)
    const contactsFromCampaign = campaignData.contacts || campaignData.contactsSummary?.items || [];
    console.log(`📬 Campaign: ${campaignId} has ${contactsFromCampaign.length} contacts in contactsSummary`);

    const contacts = contactsFromCampaign.map((contact: any, index: number) => {
      // Create unique contact ID: phone_index
      const contactId = `${contact.phone || contact.id || contact.name}_${index}`;
      return {
        id: contactId,
        name: contact.name || "Unknown",
        phone: contact.phone || "",
        profilePic: contact.profilePic || `https://i.pravatar.cc/50?u=${contactId}`,
        lastMessage: "",
        timestamp: "",
        unread: false,
      };
    });

    console.log(`✅ Returning ${contacts.length} contacts for campaign ${campaignId}`);

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("❌ Error fetching contacts:", error);
    return NextResponse.json(
      { error: String(error), contacts: [] },
      { status: 200 }
    );
  }
}
