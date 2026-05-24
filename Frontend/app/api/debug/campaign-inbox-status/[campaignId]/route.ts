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

    // Get campaign data
    const campaignDoc = await db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .doc(campaignId)
      .get();

    if (!campaignDoc.exists) {
      return NextResponse.json({ error: "Campaign not found" });
    }

    const campaignData = campaignDoc.data() as any;
    const contacts = campaignData.contacts || campaignData.contactsSummary?.items || [];

    // Get inbox structure
    const inboxDoc = await db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .doc(campaignId)
      .collection("inbox")
      .doc("contacts")
      .get();

    let contactsInInbox = 0;
    let messagesCount = 0;
    let contactsSnapshot: any = null;

    if (inboxDoc.exists) {
      // Count contacts
      contactsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("campaigns")
        .doc(campaignId)
        .collection("inbox")
        .doc("contacts")
        .collection("contacts")
        .get();

      contactsInInbox = contactsSnapshot.docs.length;

      // Count messages
      for (const contactDoc of contactsSnapshot.docs) {
        const messagesSnapshot = await contactDoc.ref
          .collection("messages")
          .get();
        messagesCount += messagesSnapshot.docs.length;
      }
    }

    return NextResponse.json({
      campaignId,
      campaignTitle: campaignData.title,
      campaignContactsInData: contacts.length,
      inboxExists: inboxDoc.exists,
      contactsInInbox,
      totalMessagesInInbox: messagesCount,
      inboxContacts: contactsInInbox > 0 ? contactsSnapshot.docs.map((d: any) => ({
        id: d.id,
        name: d.data().contactName,
        phone: d.data().contactPhone,
      })) : [],
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
