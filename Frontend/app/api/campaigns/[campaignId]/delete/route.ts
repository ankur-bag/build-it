import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";

type Context = { params: Promise<{ campaignId: string }> };

export async function DELETE(
  request: NextRequest,
  { params }: Context
): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { campaignId } = await params;

    if (!campaignId) {
      return NextResponse.json(
        { error: "Missing campaignId" },
        { status: 400 }
      );
    }

    const ref = db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .doc(campaignId);

    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    console.log("🗑️ Deleting campaign:", campaignId);

    await ref.delete();

    console.log("✅ Campaign deleted:", campaignId);

    return NextResponse.json({
      success: true,
      campaignId,
    });
  } catch (error) {
    console.error("Campaign delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
