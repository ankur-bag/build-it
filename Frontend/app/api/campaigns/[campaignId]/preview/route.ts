import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { auth } from "@clerk/nextjs/server";

type Context = { params: Promise<{ campaignId: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId } = await params;

    if (!campaignId) {
      return NextResponse.json(
        { error: "Missing campaignId" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, previewText, assets, contactsFileAction } = body;

    console.log("✏️ Updating campaign:", campaignId);

    const ref = db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .doc(campaignId);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (previewText !== undefined) updateData.previewText = previewText;
    if (assets !== undefined) updateData.assets = assets;

    if (contactsFileAction === "remove") {
      updateData.contactsFile = null;
    }

    await ref.set(updateData, { merge: true });

    console.log("✅ Campaign updated successfully");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}
