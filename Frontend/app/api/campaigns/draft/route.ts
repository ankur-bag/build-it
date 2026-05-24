import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { ensureVectorProject } from "@/lib/vectoruser-store";

interface CreateDraftPayload {
  campaignId?: string;
  title: string;
  description: string;
  wordLimit?: number;
  channels?: any;
  toneOfVoice?: "friendly" | "professional" | "energetic" | "formal" | "casual";
}

/**
 * POST /api/campaigns/draft
 * 
 * Creates or updates a draft campaign.
 * - If campaignId is provided: patches the existing document
 * - If campaignId is missing: creates a new document with generated ID
 * 
 * Returns { campaignId } so the client can persist it for all later steps.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: CreateDraftPayload = await request.json();
    const { campaignId, title, description, wordLimit, channels, toneOfVoice } = body;

    // Validate required fields
    // Title is only required when creating a new document (no campaignId)
    if (!campaignId && !title) {
      return NextResponse.json(
        { error: "Title is required when creating a new campaign" },
        { status: 400 }
      );
    }

    const campaignsRef = db
      .collection("users")
      .doc(userId)
      .collection("campaigns");

    // Build data object, skipping undefined values
    const baseData: any = {
      status: "draft",
      updatedAt: new Date(),
    };

    // Only add optional fields if they are defined
    if (title !== undefined) {
      baseData.title = title;
    }
    if (description !== undefined) {
      baseData.description = description;
    }
    if (wordLimit !== undefined) {
      baseData.wordLimit = wordLimit;
    }
    if (channels !== undefined) {
      baseData.channels = channels;
    }
    if (toneOfVoice !== undefined) {
      baseData.toneOfVoice = toneOfVoice;
    }

    let ref: any;
    let isNew = false;

    if (campaignId) {
      // Patch existing draft
      console.log("📝 Patching existing draft campaign:", campaignId);
      ref = campaignsRef.doc(campaignId);
      
      await ref.set(baseData, { merge: true });

      console.log("✅ Draft campaign patched:", campaignId);
    } else {
      // Create new draft
      console.log("📝 Creating new draft campaign");
      ref = campaignsRef.doc();
      
      baseData.createdAt = new Date();
      baseData.assets = [];
      baseData.contactsFile = null;
      baseData.contactsSummary = null;
      baseData.aiDescription = null;
      baseData.previewText = null;
      baseData.channelContent = {};
      
      await ref.set(baseData);

      console.log("✅ Draft campaign created:", ref.id);
      isNew = true;

      try {
        await ensureVectorProject(userId, ref.id);
      } catch (vectorError) {
        console.error("Vector project init error:", vectorError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        campaignId: ref.id,
      },
      { status: isNew ? 201 : 200 }
    );
  } catch (error) {
    console.error("Draft campaign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
