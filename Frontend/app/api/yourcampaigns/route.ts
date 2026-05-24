import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { auth } from "@clerk/nextjs/server";



export async function GET(request: NextRequest) {
  
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("📋 Fetching launched campaigns for user:", userId);

    const snap = await db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .where("status", "==", "launched")
      .orderBy("createdAt", "asc")
      .get();

    const campaigns = snap.docs
      .map((doc) => {
        const data = doc.data() as any;
        
        // ✅ Extract nested fields properly
        const channelContent = {
          voice: { transcript: data.channelContent?.voice?.transcript || '' },
          calls: { transcript: data.channelContent?.calls?.transcript || '' }
        };
        
        const audioUrls = {
          voice: data.audioUrls?.voice || '',
          calls: data.audioUrls?.calls || ''
        };
        
        const audioPublicIds = {
          voice: data.audioPublicIds?.voice || '',
          calls: data.audioPublicIds?.calls || ''
        };

          return {
            id: doc.id,
            ...data,
            channelContent,
            audioUrls,
            audioPublicIds,
            vapiStats: data.vapiStats || null,
          };
      })
      .reverse();

    console.log(`✅ Found ${campaigns.length} launched campaigns`);
    
    // Better logging
    if (campaigns.length > 0) {
      console.log('📊 First campaign transcripts:', {
        voice: campaigns[0].channelContent?.voice?.transcript?.substring(0, 100) + '...',
        calls: campaigns[0].channelContent?.calls?.transcript?.substring(0, 100) + '...',
        audioVoice: campaigns[0].audioUrls?.voice ? '✅' : '❌',
        audioCalls: campaigns[0].audioUrls?.calls ? '✅' : '❌',
      });
    }

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
