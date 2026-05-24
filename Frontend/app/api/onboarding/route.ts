import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { auth } from "@clerk/nextjs/server";
import { OnboardingProfile, COLLECTIONS } from "@/lib/schemas";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Create profile data with all fields, using defaults for undefined values
    const profileData = {
      userId,
      businessType: body.businessType ?? "",
      targetAudience: body.targetAudience ?? "",
      brandStyle: Array.isArray(body.brandStyle) ? body.brandStyle : [],
      responsePreference: body.responsePreference ?? "",
      language: body.language ?? "",
      region: body.region ?? "",
      complianceNotes: body.complianceNotes ?? "",
      termsAccepted: Boolean(body.termsAccepted),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Ensure no undefined values exist
    Object.keys(profileData).forEach((key) => {
      if (profileData[key as keyof typeof profileData] === undefined) {
        delete profileData[key as keyof typeof profileData];
      }
    });
    const docRef = db
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection(COLLECTIONS.ONBOARDING)
      .doc("profile");

    await docRef.set(profileData, { merge: true });

    return NextResponse.json(
      {
        success: true,
        message: "Onboarding profile saved",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Onboarding save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save onboarding profile" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docRef = db
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection(COLLECTIONS.ONBOARDING)
      .doc("profile");

    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { profile: null },
        { status: 200 }
      );
    }

    const profileData = doc.data();
    return NextResponse.json(
      {
        profile: {
          ...profileData,
          createdAt: profileData?.createdAt?.toDate?.() || null,
          updatedAt: profileData?.updatedAt?.toDate?.() || null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Onboarding fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch onboarding profile" },
      { status: 500 }
    );
  }
}
