import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Normalize phone number to consistent format (digits only with country code)
 */
function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  return digits;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Migrating old campaigns to add messages...");

    // Get all launched campaigns
    const campaignsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .get();

    const launchedCampaigns = campaignsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.status === "launched" || data.launchedAt;
    });

    console.log(`📊 Found ${launchedCampaigns.length} launched campaigns`);

    let campaignsUpdated = 0;
    let contactsAdded = 0;

    for (const doc of launchedCampaigns) {
      const campaignId = doc.id;
      const campaignData = doc.data() as any;
      const contacts = campaignData.contacts || campaignData.contactsSummary?.items || [];

      if (contacts.length === 0) continue;

      console.log(`\n📦 Processing campaign: ${campaignId} (${campaignData.title})`);

      const inboxContactsRef = doc.ref
        .collection("inbox")
        .doc("contacts");

      // Check if inbox already exists
      const inboxDoc = await inboxContactsRef.get();
      if (inboxDoc.exists) {
        console.log(`   ℹ️ Inbox already exists, checking for missing messages...`);
      } else {
        console.log(`   ℹ️ Creating inbox structure...`);
        await inboxContactsRef.set({
          createdAt: FieldValue.serverTimestamp(),
          totalContacts: contacts.length,
        });
      }

      let batch = db.batch();
      let batchOps = 0;
      let addedCount = 0;

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const normalizedPhone = normalizePhoneNumber(contact.phone || '');
        const contactId = `${normalizedPhone || contact.id || contact.name}_${i}`;

        const contactRef = inboxContactsRef
          .collection("contacts")
          .doc(contactId);

        // Check if contact already exists
        const contactDoc = await contactRef.get();
        if (!contactDoc.exists) {
          batch.set(contactRef, {
            contactId: contactId,
            contactName: contact.name || "Unknown",
            contactPhone: normalizedPhone,
            profilePic: contact.profilePic || "",
            lastMessage: "",
            lastMessageTime: null,
            unreadCount: 0,
            createdAt: FieldValue.serverTimestamp(),
          });
          batchOps++;
          console.log(`     ✓ Created contact: ${contact.name} (${contactId})`);
        } else {
          console.log(`     ℹ️ Contact already exists: ${contact.name} (${contactId})`);
        }

        // Add campaign title message
        if (campaignData.title) {
          const msgRef = contactRef.collection("messages").doc("msg_title");
          batch.set(msgRef, {
            sender: "campaign",
            type: "text",
            content: campaignData.title,
            timestamp: new Date(Date.now() - 5000).toISOString(),
            createdAt: FieldValue.serverTimestamp(),
          });
          batchOps++;
        }

        // Add campaign preview message
        if (campaignData.previewText || campaignData.description) {
          const msgRef = contactRef.collection("messages").doc("msg_preview");
          const descText = typeof campaignData.description === "string" 
            ? campaignData.description 
            : campaignData.description?.aiEnhanced || campaignData.description?.original || "";
          
          batch.set(msgRef, {
            sender: "campaign",
            type: "text",
            content: campaignData.previewText || descText || "",
            timestamp: new Date(Date.now() - 4000).toISOString(),
            createdAt: FieldValue.serverTimestamp(),
          });
          batchOps++;
        }

        // Add audio message if exists
        if (campaignData.audioUrls?.voice) {
          const msgRef = contactRef.collection("messages").doc("msg_audio");
          batch.set(msgRef, {
            sender: "campaign",
            type: "audio",
            content: "Voice message",
            audioUrl: campaignData.audioUrls.voice,
            timestamp: new Date(Date.now() - 3000).toISOString(),
            createdAt: FieldValue.serverTimestamp(),
          });
          batchOps++;
        }

        // Add assets message if exists
        if (campaignData.assets?.length > 0) {
          const msgRef = contactRef.collection("messages").doc("msg_assets");
          batch.set(msgRef, {
            sender: "campaign",
            type: "text",
            content: `📎 ${campaignData.assets.length} file(s)`,
            assets: campaignData.assets,
            timestamp: new Date(Date.now() - 2000).toISOString(),
            createdAt: FieldValue.serverTimestamp(),
          });
          batchOps++;
        }

        addedCount++;

        // Commit batch if reaching limit
        if (batchOps >= 450) {
          console.log(`   💾 Committing batch (${batchOps} ops)...`);
          await batch.commit();
          console.log(`   ✅ Batch committed`);
          batch = db.batch();
          batchOps = 0;
        }
      }

      // Commit remaining
      if (batchOps > 0) {
        console.log(`   💾 Committing final batch (${batchOps} ops)...`);
        await batch.commit();
        console.log(`   ✅ Final batch committed`);
      }

      campaignsUpdated++;
      contactsAdded += addedCount;
      console.log(`   ✅ Updated with ${addedCount} contacts`);
    }

    console.log(`\n✅ Migration complete: ${campaignsUpdated} campaigns, ${contactsAdded} contacts`);

    return NextResponse.json({
      success: true,
      campaignsUpdated,
      contactsAdded,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
