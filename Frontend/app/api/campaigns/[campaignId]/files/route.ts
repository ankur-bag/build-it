/**
 * File Upload Route Handler
 * 
 * This route handles all file uploads for a campaign:
 * - Assets (images, videos) - stored in "assets" FormData entries
 * - Contacts CSV/Excel - stored in "contactsFile" FormData entry
 * 
 * Files are uploaded to Cloudinary and metadata is stored in Firestore.
 * This is the primary REST API endpoint for file uploads (replaces Server Actions).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { auth } from "@clerk/nextjs/server";
import { uploadToCloudinary } from "@/lib/cloudinary";

type Context = { params: Promise<{ campaignId: string }> };

export async function POST(request: NextRequest, { params }: Context) {
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

    console.log("⚙️ files route hit for campaign:", campaignId);

    const formData = await request.formData();
    console.log("✅ formData parsed successfully");

    const assetFiles = formData.getAll("assets") as File[];
    const contactsFileData = formData.get("contactsFile") as File | null;

    console.log("📊 Received:", {
      assetsCount: assetFiles.length,
      assetsNames: assetFiles.map(f => f.name),
      hasContacts: !!contactsFileData,
      contactsFileName: contactsFileData?.name,
    });

    // 1) Upload assets (images/videos)
    const assets: Array<{ url: string; publicId: string; type: "image" | "video" }> = [];

    for (const file of assetFiles) {
      console.log(`📤 Uploading asset: ${file.name}`);
      const res: any = await uploadToCloudinary(
        file,
        `campaigns/${userId}/assets`,
        "auto"
      );
      assets.push({ url: res.secure_url, publicId: res.public_id, type: res.resource_type });
      console.log(`✅ Asset uploaded: ${res.public_id}`);
    }

    // 2) Upload contacts CSV/Excel
    let contactsFile: { url: string; publicId: string; name?: string } | null = null;

    if (contactsFileData) {
      console.log(`📤 Uploading contacts file: ${contactsFileData.name}`);
      const res: any = await uploadToCloudinary(
        contactsFileData,
        `campaigns/${userId}/contacts`,
        "raw"
      );
      contactsFile = { 
        url: res.secure_url, 
        publicId: res.public_id,
        name: contactsFileData.name 
      };
      console.log(`✅ Contacts file uploaded: ${res.public_id}`);
    }

    // 3) Patch Firestore with URLs/IDs
    const ref = db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .doc(campaignId);

    console.log("💾 Patching Firestore...");

    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only update assets if any were uploaded in this request
    if (assetFiles.length > 0) {
      updateData.assets = assets;
    }

    // Always update contactsFile if provided
    if (contactsFileData) {
      updateData.contactsFile = contactsFile;
    }

    await ref.set(updateData, { merge: true });

    console.log("✅ Campaign files saved:", {
      assets: assets.length,
      hasContacts: !!contactsFile,
    });

    return NextResponse.json({
      success: true,
      assets,
      contactsFile,
    });
  } catch (error) {
    console.error("Files upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
