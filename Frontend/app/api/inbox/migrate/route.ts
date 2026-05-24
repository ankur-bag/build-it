import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🚀 Starting migration for user:", userId);

    // Get all campaigns for this user
    const allCampaignsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("campaigns")
      .get();

    // Filter for launched campaigns only
    const campaignsSnapshot = {
      docs: allCampaignsSnapshot.docs.filter(doc => {
        const data = doc.data() as any;
        return data.status === "launched" || data.launchedAt;
      })
    };

    console.log(`📊 Found ${campaignsSnapshot.docs.length} launched campaigns`);

    if (campaignsSnapshot.docs.length === 0) {
      return NextResponse.json({
        message: "No campaigns found",
        migrated: 0,
      });
    }

    let migratedCount = 0;
    let contactsCount = 0;

    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaignId = campaignDoc.id;
      const campaignData = campaignDoc.data() as any;

      console.log(`\n📦 Campaign: ${campaignId}`);
      console.log(`   Title: ${campaignData.title}`);

      // Get contacts - handle both formats
      const contactsArray = campaignData.contacts || [];
      const contactsSummary = campaignData.contactsSummary?.items || [];
      
      console.log(`   contacts array: ${contactsArray.length}`);
      console.log(`   contactsSummary.items: ${contactsSummary.length}`);
      
      const contacts = contactsArray.length > 0 ? contactsArray : contactsSummary;
      console.log(`   Using ${contacts.length} contacts`);
      console.log(`   Contacts array type: ${Array.isArray(contacts) ? 'array' : typeof contacts}`);
      
      if (!Array.isArray(contacts) || contacts.length === 0) {
        console.log(`   ⚠️ No valid contacts, skipping...`);
        continue;
      }

      let batch = db.batch();
      let batchOps = 0;
      let campaignContactsAdded = 0;

      for (const contact of contacts) {
        const contactId = contact.phone || contact.id || `contact_${contactsCount}`;

        const contactRef = db
          .collection("users")
          .doc(userId)
          .collection("campaigns")
          .doc(campaignId)
          .collection("inbox")
          .doc("contacts")
          .collection("contacts")
          .doc(contactId);

        // Set contact info
        batch.set(contactRef, {
          contactId: contactId,
          contactName: contact.name || "Unknown",
          contactPhone: contact.phone || "",
          profilePic: contact.profilePic || "",
          lastMessage: "",
          lastMessageTime: null,
          unreadCount: 0,
          createdAt: FieldValue.serverTimestamp(),
        });
        batchOps++;
        campaignContactsAdded++;
        console.log(`     ✓ Contact: ${contact.name} (${contactId})`);

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
          batch.set(msgRef, {
            sender: "campaign",
            type: "text",
            content: campaignData.previewText || campaignData.description || "",
            timestamp: new Date(Date.now() - 4000).toISOString(),
            createdAt: FieldValue.serverTimestamp(),
          });
          batchOps++;
        }

        // Add audio message
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

        // Add assets message
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

        contactsCount++;

        // Commit batch if reaching limit
        if (batchOps >= 450) {
          console.log(`   💾 Committing batch (${batchOps} ops)`);
          await batch.commit();
          console.log(`   ✅ Batch committed successfully`);
          // Create a NEW batch for remaining operations
          batch = db.batch();
          batchOps = 0;
        }
      }

      // Commit remaining
      if (batchOps > 0) {
        console.log(`   💾 Committing final batch (${batchOps} ops) for ${campaignContactsAdded} contacts`);
        await batch.commit();
        console.log(`   ✅ Final batch committed successfully`);
      }
      migratedCount++;
      console.log(`   ✅ Campaign migrated with ${campaignContactsAdded} contacts`);
    }

    console.log(`\n🎉 Complete: ${migratedCount} campaigns, ${contactsCount} contacts`);

    return NextResponse.json({
      success: true,
      migratedCampaigns: migratedCount,
      totalContacts: contactsCount,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
