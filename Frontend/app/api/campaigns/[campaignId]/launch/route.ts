import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { initializeAnalysisData } from "@/lib/analysis-ops";

type Context = { params: Promise<{ campaignId: string }> };

/**
 * Normalize phone number to consistent format (digits only with country code)
 * Examples:
 *   "+91 9883131455" → "919883131455"
 *   "9883131455" → "919883131455" (assumes India +91)
 *   "919883131455" → "919883131455"
 */
function normalizePhoneNumber(raw: string): string {
  if (!raw) return ''
  // Remove all non-digit characters
  let digits = String(raw).replace(/\D/g, '')
  // If exactly 10 digits, assume India (+91)
  if (digits.length === 10) {
    digits = '91' + digits
  }
  return digits
}

/**
 * POST /api/campaigns/[campaignId]/launch
 * 
 * Marks a draft campaign as launched.
 * Sets status: "launched" and launchedAt timestamp.
 * Campaign will now appear in /yourcampaigns list.
 */
export async function POST(
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

    console.log("🚀 Launching campaign:", campaignId);

    const campaignData = snap.data() as any;

    // Log campaign data to verify structure
    console.log("📊 Campaign data audioUrls:", campaignData.audioUrls);
    console.log("📊 Campaign data channels:", Object.keys(campaignData.channels || {}));
    console.log("📊 Campaign data contactsSummary:", campaignData.contactsSummary);
    console.log("📊 Campaign data contacts (legacy):", campaignData.contacts);

    // Get contacts FIRST from campaign data (before any writes)
    // Check both new format (contactsSummary.items) and legacy format (contacts array)
    let contacts = [];
    if (campaignData.contactsSummary?.items && Array.isArray(campaignData.contactsSummary.items)) {
      contacts = campaignData.contactsSummary.items;
      console.log(`📦 Found ${contacts.length} contacts in contactsSummary.items (NEW FORMAT)`);
    } else if (campaignData.contacts && Array.isArray(campaignData.contacts)) {
      contacts = campaignData.contacts;
      console.log(`📦 Found ${contacts.length} contacts in contacts array (LEGACY FORMAT)`);
    }
    
    console.log(`📋 Contact list:`, contacts.map((c: any) => ({ name: c.name, phone: c.phone })));

    if (contacts.length === 0) {
      console.warn("⚠️ No contacts found in campaign, cannot launch");
      return NextResponse.json(
        { error: "Campaign has no contacts to launch" },
        { status: 400 }
      );
    }

    // Launch the campaign
    await ref.set(
      {
        status: "launched",
        launchedAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    console.log("✅ Campaign marked as launched");

    // Initialize analysis data for this campaign
    await initializeAnalysisData(userId, campaignId, campaignData.title);
    console.log("📊 Analysis collection initialized");

    // 🔥 NEW: Save contact numbers to root "contacts" collection
    // Structure: contacts/{phoneNumber}/ → campaigns: [{ campaignId, userId, title, ... }], lastCampaignId
    console.log("📞 Updat the root contacts collection with these numbers...");
    
    if (contacts.length > 0) {
      let contactBatch = db.batch();
      let batchOps = 0;

      for (const contact of contacts) {
        const normalizedPhone = normalizePhoneNumber(contact.phone || '');
        if (!normalizedPhone) continue;

        const contactDocRef = db.collection("contacts").doc(normalizedPhone);
        
        // Get existing contact doc to append campaign (if exists)
        const existingContactSnap = await contactDocRef.get();
        let existingCampaigns = [];
        
        if (existingContactSnap.exists) {
          existingCampaigns = existingContactSnap.data()?.campaigns || [];
        }

        // Add new campaign to the campaigns array
        const newCampaign = {
          campaignId: campaignId,
          userId: userId,
          title: campaignData.title || "",
          description: typeof campaignData.description === "string" 
            ? campaignData.description 
            : campaignData.description?.aiEnhanced || campaignData.description?.original || "",
          channels: campaignData.channels || {},
          audioUrl: campaignData.audioUrls?.voice || null,
          assets: campaignData.assets || [],
          launchedAt: new Date(),
        };

        existingCampaigns.push(newCampaign);

        // Update contact doc with campaigns array and lastCampaignId
        contactBatch.set(
          contactDocRef,
          {
            phone: normalizedPhone,
            campaigns: existingCampaigns,
            lastCampaignId: campaignId, // Most recent campaign
            updatedAt: new Date(),
          },
          { merge: true }
        );

        batchOps++;
        console.log(`  ✓ Queued contact: ${contact.name} (${normalizedPhone})`);
        console.log(`    └─ Added campaign to contacts/${normalizedPhone}`);

        // Commit batch if reaching limit
        if (batchOps >= 450) {
          console.log(`💾 Committing contacts batch (${batchOps} ops)...`);
          await contactBatch.commit();
          console.log(`✅ Batch committed successfully`);
          contactBatch = db.batch();
          batchOps = 0;
        }
      }

      // Commit remaining
      if (batchOps > 0) {
        console.log(`💾 Committing final contacts batch (${batchOps} ops)...`);
        await contactBatch.commit();
        console.log(`✅ Final batch committed successfully`);
      }

      console.log(`✅ All ${contacts.length} contacts updated in root contacts collection`);
      console.log(`📞 Contacts stored at: contacts/{phoneNumber}/`);
    }

    // Create inbox structure for this campaign
    console.log("📬 Creating inbox structure with contacts...");
    
    const inboxContactsRef = ref
      .collection("inbox")
      .doc("contacts");

    // Create the inbox/contacts document
    await inboxContactsRef.set({
      createdAt: new Date(),
      totalContacts: contacts.length,
    });

    console.log(`✅ Created inbox/contacts document with totalContacts: ${contacts.length}`);

    if (contacts.length > 0) {
      let batch = db.batch();
      let batchOps = 0;
      let addedCount = 0;

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        
        // Normalize phone number for consistent matching
        const normalizedPhone = normalizePhoneNumber(contact.phone || '');
        
        // Create unique contact ID: phone_index (e.g., 919883131455_0, 919883131455_1)
        const contactId = `${normalizedPhone || contact.id || contact.name}_${i}`;

        const contactRef = inboxContactsRef
          .collection("contacts")
          .doc(contactId);

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
        addedCount++;
        console.log(`  ✓ Queuing contact: ${contact.name} (${contactId})`);
        console.log(`    └─ Phone normalized: ${contact.phone} → ${normalizedPhone}`);
        console.log(`    └─ Path: campaigns/${campaignId}/inbox/contacts/contacts/${contactId}`);

        // 🔥 CRITICAL: Create messageTracking document for backend lookup
        // This allows backend's findLatestCampaignByPhone() to find this campaign
        const trackingRef = ref
          .collection("messageTracking")
          .doc(`tracking_${normalizedPhone}_${i}`);
        
        batch.set(trackingRef, {
          contactPhone: normalizedPhone,
          contactId: contactId,
          sentAt: new Date().toISOString(),
          status: "pending",
          createdAt: FieldValue.serverTimestamp(),
        });
        batchOps++;
        console.log(`    📍 Created messageTracking for phone lookup`);

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
          console.log(`    📝 Added title message`);
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
          console.log(`    📝 Added preview message`);
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
          console.log(`    Added audio message`);
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
          console.log(`    📎 Added assets message`);
        }

        // Commit batch if reaching limit
        if (batchOps >= 450) {
          console.log(`💾 Committing batch (${batchOps} ops)...`);
          await batch.commit();
          console.log(`✅ Batch committed successfully`);
          batch = db.batch();
          batchOps = 0;
        }
      }

      // Commit remaining
      if (batchOps > 0) {
        console.log(`💾 Committing final batch (${batchOps} ops) for ${addedCount} contacts...`);
        await batch.commit();
        console.log(`✅ Final batch committed successfully`);
      }

      console.log(`✅✅✅ All ${addedCount} contacts added to Firestore inbox with normalized phone numbers`);
      console.log(`📞 Contacts stored at: users/${userId}/campaigns/${campaignId}/inbox/contacts/contacts/`);
    }

    // Trigger automatic AI message sending to all contacts (Firestore demo inbox)
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/campaigns/${campaignId}/send-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })
    } catch (error) {
      console.error('Error triggering message sending:', error)
      // Don't fail the launch if message sending fails
    }

    // ── Send real WhatsApp messages via backend ──────────────────────────────
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

      // Build description string
      let descriptionStr = "";
      if (typeof campaignData.description === "string") {
        descriptionStr = campaignData.description;
      } else if (campaignData.description && typeof campaignData.description === "object") {
        descriptionStr = campaignData.description.aiEnhanced || campaignData.description.original || "";
      }

      const waPayload = {
        userId, // Include user ID for tracking
        campaignId, // Include campaign ID for tracking
        contacts: contacts.map((c: any, index: number) => ({
          name: c.name || "Customer",
          phone: c.phone || "",
          contactId: `${c.phone || c.id || c.name}_${index}`, // Generate consistent contact ID
        })),
        title: campaignData.title || "",
        description: descriptionStr,
        audioUrl: campaignData.audioUrls?.voice || null,
        assets: campaignData.assets || [],
      };

      console.log(`📱 Sending real WhatsApp to ${waPayload.contacts.length} contacts via backend...`);
      console.log(`   Campaign ID: ${campaignId}`);
      console.log(`   Title: ${waPayload.title}`);
      console.log(`   Description: ${waPayload.description.substring(0, 50)}...`);
      console.log(`   Audio URL: ${waPayload.audioUrl || '❌ MISSING - NO AUDIO WILL BE SENT'}`);
      console.log(`   Assets: ${waPayload.assets.length} files`);

      const waRes = await fetch(`${backendUrl}/api/whatsapp/send-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waPayload),
      });

      const waData = await waRes.json();
      console.log(`✅ WhatsApp backend response:`, JSON.stringify(waData.summary || waData));
    } catch (error) {
      console.error('❌ WhatsApp backend error (non-fatal):', error);
      // Don't fail the campaign launch if WhatsApp delivery fails
    }

    // ── Final Verification Summary ──────────────────────────────────────────
    console.log(`\n${'█'.repeat(80)}`);
    console.log(`✅✅✅ CAMPAIGN LAUNCHED SUCCESSFULLY`);
    console.log(`${'█'.repeat(80)}`);
    console.log(`\n📊 FIRESTORE STRUCTURE CREATED:`);
    console.log(`   ✅ Campaign: users/${userId}/campaigns/${campaignId}`);
    console.log(`      └─ status: "launched"`);
    console.log(`      └─ launchedAt: ${new Date().toISOString()}`);
    console.log(`   ✅ Contacts: ${contacts.length} contacts stored`);
    console.log(`      └─ Path: users/${userId}/campaigns/${campaignId}/inbox/contacts/contacts/{contactId}`);
    contacts.forEach((c: any, i: number) => {
      const phone = normalizePhoneNumber(c.phone || '');
      console.log(`         • ${c.name}: ${phone}`);
    });
    console.log(`   ✅ MessageTracking: Created for backend phone lookup`);
    console.log(`      └─ Path: users/${userId}/campaigns/${campaignId}/messageTracking/{trackingId}`);
    console.log(`\n📞 PHONE LOOKUP READY:`);
    console.log(`   Backend can now find this campaign when receiving messages from:`);
    contacts.forEach((c: any) => {
      const phone = normalizePhoneNumber(c.phone || '');
      console.log(`   • ${phone} (${c.name})`);
    });
    console.log(`\n${'█'.repeat(80)}\n`);

    return NextResponse.json({
      success: true,
      campaignId,
    });
  } catch (error) {
    console.error("Campaign launch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
