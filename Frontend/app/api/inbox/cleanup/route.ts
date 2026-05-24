import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🗑️ Cleaning up old inbox data for user:", userId);

    // Delete all inbox collections from all campaigns
    const campaignsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .get();

    let deletedCampaigns = 0;
    let deletedContacts = 0;
    let deletedMessages = 0;

    for (const campaignDoc of campaignsSnapshot.docs) {
      const inboxSnapshot = await campaignDoc.ref
        .collection("inbox")
        .get();

      for (const inboxDoc of inboxSnapshot.docs) {
        const contactsSnapshot = await inboxDoc.ref
          .collection("contacts")
          .get();

        for (const contactDoc of contactsSnapshot.docs) {
          const messagesSnapshot = await contactDoc.ref
            .collection("messages")
            .get();

          for (const msgDoc of messagesSnapshot.docs) {
            await msgDoc.ref.delete();
            deletedMessages++;
          }
          await contactDoc.ref.delete();
          deletedContacts++;
        }
        await inboxDoc.ref.delete();
      }
      deletedCampaigns++;
    }

    console.log(`✅ Cleanup complete: ${deletedCampaigns} campaigns, ${deletedContacts} contacts, ${deletedMessages} messages`);

    return NextResponse.json({
      success: true,
      message: "Cleanup complete",
      deletedCampaigns,
      deletedContacts,
      deletedMessages,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
