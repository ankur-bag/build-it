import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { auth } from "@clerk/nextjs/server";

type Context = { params: Promise<{ campaignId: string }> };

export async function GET(
  request: NextRequest,
  { params }: Context
): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId } = await params;

    const campaignDoc = await db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .doc(campaignId)
      .get();

    if (!campaignDoc.exists) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const campaignData = campaignDoc.data() as any;

    // ✅ CORRECT PRIORITY FOR MESSAGE TEXT
    const previewText = 
      campaignData.previewText ||                              // ✅ PRIORITY 1: AI previewText
      campaignData.channelContent?.voice?.transcript ||        // ✅ PRIORITY 2: Voice transcript
      campaignData.description?.original ||                    // ✅ PRIORITY 3: Original description
      "";

    const campaignDetails = {
      id: campaignId,
      title: campaignData.title,
      previewText,
      audioUrls: {
        voice: campaignData.audioUrls?.voice || "",
        calls: campaignData.audioUrls?.calls || "",
      },
      assets: campaignData.assets || [],
    };

    console.log("🎯 Campaign message data:", {
      previewText: previewText.substring(0, 50),
      hasVoice: !!campaignDetails.audioUrls.voice,
      assetCount: campaignDetails.assets.length,
      firstAsset: campaignDetails.assets[0]?.url,
    });

    return NextResponse.json({ campaignDetails });
  } catch (error) {
    console.error("Error fetching campaign details:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign details" },
      { status: 500 }
    );
  }
}
