import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('👤 User ID:', userId);

    const campaignsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .get();

    console.log(`📊 Found ${campaignsSnapshot.docs.length} total campaigns`);

    // Filter for launched campaigns only
    const launchedCampaigns = campaignsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.status === "launched" || data.launchedAt;
    });

    console.log(`📊 Found ${launchedCampaigns.length} launched campaigns`);

    const campaigns = [];

    for (const doc of launchedCampaigns) {
      const campaignData = doc.data();
      const campaignId = doc.id;

      console.log(`\n📦 Campaign: ${campaignId} (${campaignData.title})`);

      // Get contacts from campaign's contactsSummary (source of truth)
      const contactsFromCampaign = campaignData.contacts || campaignData.contactsSummary?.items || [];
      console.log(`   Found ${contactsFromCampaign.length} contacts in campaign data`);

      // Safely extract description string
      let descriptionStr = "";
      if (typeof campaignData.description === "string") {
        descriptionStr = campaignData.description;
      } else if (campaignData.description && typeof campaignData.description === "object") {
        descriptionStr = campaignData.description.aiEnhanced || campaignData.description.original || "";
      }

      campaigns.push({
        id: campaignId,
        title: campaignData.title,
        description: descriptionStr,
        contactCount: contactsFromCampaign.length,
        launchedAt: campaignData.launchedAt || campaignData.createdAt,
        audioUrls: campaignData.audioUrls || {},
        assets: campaignData.assets || [],
        contacts: contactsFromCampaign.map((contact: any, index: number) => {
          const contactId = `${contact.phone || contact.id || contact.name}_${index}`;
          return {
            id: contactId,
            name: contact.name || "Unknown",
            phone: contact.phone || "",
            lastMessage: "",
            timestamp: "",
            unread: false,
            profilePic: contact.profilePic || `https://i.pravatar.cc/50?u=${contactId}`,
          };
        }),
      });
    }

    // Sort by launchedAt/createdAt (newest first)
    campaigns.sort((a: any, b: any) => {
      const aTime = a.launchedAt?.toDate?.() || new Date(a.launchedAt || 0);
      const bTime = b.launchedAt?.toDate?.() || new Date(b.launchedAt || 0);
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    console.log(`✅ Returning ${campaigns.length} campaigns with total ${campaigns.reduce((sum, c) => sum + c.contactCount, 0)} contacts`);
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
