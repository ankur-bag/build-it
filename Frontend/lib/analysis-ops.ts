import { db } from '@/lib/firebase/admin'

/**
 * Initialize analysis collection for a campaign when it's first launched
 */
export async function initializeAnalysisData(
  userId: string,
  campaignId: string,
  campaignTitle: string
) {
  try {
    const analysisRef = db
      .collection('analysis')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    await analysisRef.set({
      campaignId,
      campaignTitle,
      createdAt: new Date(),
      updatedAt: new Date(),
      calls: {
        total: 0,
        answered: 0,
        missed: 0,
      },
      whatsapp: {
        conversations: {}, // object keyed by contactId
        users: {}, // object keyed by contactId
        totalMessages: 0,
        totalUsers: 0,
      },
    })

    console.log(`✅ Analysis data initialized for campaign ${campaignId}`)
  } catch (error) {
    console.error(`❌ Error initializing analysis data:`, error)
  }
}

/**
 * Update call analytics when a call is made or completed
 */
export async function updateCallAnalytics(
  userId: string,
  campaignId: string,
  callData: {
    duration: number
    status: 'completed' | 'failed' | 'ongoing'
    customerPhone: string
  }
) {
  try {
    console.log(`\n📝 UPDATING CALL ANALYTICS`);
    console.log(`   userId: ${userId}`);
    console.log(`   campaignId: ${campaignId}`);
    console.log(`   phone: ${callData.customerPhone}`);
    console.log(`   duration: ${callData.duration}s`);
    console.log(`   status: ${callData.status}`);

    const analysisRef = db
      .collection('analysis')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId);

    const doc = await analysisRef.get();
    let currentData = doc.data();

    console.log(`\n📚 CURRENT FIRESTORE STATE:`);
    console.log(`   Document exists: ${doc.exists}`);
    if (currentData) {
      console.log(`   calls.total: ${currentData.calls?.total}`);
      console.log(`   calls.answered: ${currentData.calls?.answered}`);
      console.log(`   calls.missed: ${currentData.calls?.missed}`);
      console.log(`   initiated count: ${currentData.initiated?.length || 0}`);
      console.log(`   answered count: ${currentData.answered?.length || 0}`);
      console.log(`   missed count: ${currentData.missed?.length || 0}`);
    }

    // If analysis document doesn't exist, create it first
    if (!currentData) {
      console.log(`\n⚠️ Analysis document doesn't exist, creating it...`);
      await analysisRef.set({
        campaignId,
        createdAt: new Date(),
        updatedAt: new Date(),
        calls: {
          total: 0,
          answered: 0,
          missed: 0,
        },
        whatsapp: {
          conversations: {},
          users: {},
          totalMessages: 0,
          totalUsers: 0,
        },
        initiated: [],
        answered: [],
        missed: [],
      });
      currentData = await analysisRef.get().then(d => d.data());
    }

    const calls = currentData?.calls || { total: 0, answered: 0, missed: 0 };
    let answered = currentData?.answered || [];
    let missed = currentData?.missed || [];
    let initiated = currentData?.initiated || [];

    console.log(`\n🔄 BEFORE UPDATE:`);
    console.log(`   Total calls: ${calls.total}`);
    console.log(`   Answered: ${calls.answered}`);
    console.log(`   Missed: ${calls.missed}`);

    // Remove the call from initiated array
    const initialIndex = initiated.findIndex((i: any) => i.phone === callData.customerPhone);
    if (initialIndex !== -1) {
      initiated.splice(initialIndex, 1);
      console.log(`   ✅ Removed from initiated array (index ${initialIndex})`);
    } else {
      console.log(`   ⚠️ Phone not found in initiated array: ${callData.customerPhone}`);
      console.log(`   Available phones in initiated:`, initiated.map((i: any) => i.phone));
    }

    const contactId = `phone_${callData.customerPhone.replace(/\D/g, '')}`;

    // DON'T increment total again - it was already incremented in recordInitialCall
    // Just move from initiated to answered/missed
    if (callData.status === 'completed' && callData.duration > 0) {
      calls.answered += 1;
      // Store which contact answered
      if (!answered.some((a: any) => a.phone === callData.customerPhone)) {
        answered.push({
          contactId,
          phone: callData.customerPhone,
          contactName: 'Unknown', // Will be updated by campaign context
          answeredAt: new Date().toISOString(),
          duration: callData.duration,
        });
        console.log(`   ✅ Added to answered array`);
      } else {
        console.log(`   ⚠️ Already in answered array, skipping`);
      }
    } else {
      calls.missed += 1;
      // Store which contact missed
      if (!missed.some((m: any) => m.phone === callData.customerPhone)) {
        missed.push({
          contactId,
          phone: callData.customerPhone,
          contactName: 'Unknown',
          missedAt: new Date().toISOString(),
        });
        console.log(`   ✅ Added to missed array`);
      } else {
        console.log(`   ⚠️ Already in missed array, skipping`);
      }
    }

    console.log(`\n✍️ WRITING TO FIRESTORE:`);
    console.log(`   calls.total: ${calls.total}`);
    console.log(`   calls.answered: ${calls.answered}`);
    console.log(`   calls.missed: ${calls.missed}`);
    console.log(`   initiated array length: ${initiated.length}`);
    console.log(`   answered array length: ${answered.length}`);
    console.log(`   missed array length: ${missed.length}`);

    await analysisRef.update({
      calls,
      answered,
      missed,
      initiated,
      updatedAt: new Date(),
    });

    console.log(`\n✅ FIRESTORE UPDATE COMPLETE`);
    console.log(`📊 Final Analytics: Total: ${calls.total}, Answered: ${calls.answered}, Missed: ${calls.missed}\n`);
  } catch (error) {
    console.error(`\n❌ ERROR updating call analytics:`, error);
    throw error;
  }
}

/**
 * Add WhatsApp conversation to analysis
 */
export async function addWhatsAppConversation(
  userId: string,
  campaignId: string,
  conversationData: {
    contactId: string
    contactName: string
    phone: string
    messages: any[]
  }
) {
  try {
    const analysisRef = db
      .collection('analysis')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    const doc = await analysisRef.get()
    const currentData = doc.data() || {}
    const conversations = currentData.whatsapp?.conversations || {}

    // Store conversation as an object keyed by contactId
    conversations[conversationData.contactId] = {
      contactId: conversationData.contactId,
      contactName: conversationData.contactName,
      phone: conversationData.phone,
      messages: conversationData.messages || [],
      messagesSent: conversationData.messages?.filter((m: any) => m.sender === 'campaign').length || 0,
      messagesReceived: conversationData.messages?.filter((m: any) => m.sender !== 'campaign').length || 0,
      updatedAt: new Date().toISOString(),
    }

    // Calculate total messages
    const totalMessages = Object.values(conversations).reduce(
      (sum: number, conv: any) => sum + (conv.messages?.length || 0),
      0
    )

    await analysisRef.update({
      'whatsapp.conversations': conversations,
      'whatsapp.totalMessages': totalMessages,
      updatedAt: new Date(),
    })

    console.log(`✅ WhatsApp conversation added for contact ${conversationData.phone}`)
  } catch (error) {
    console.error(`❌ Error adding WhatsApp conversation:`, error)
  }
}

/**
 * Add/update WhatsApp user interaction
 */
export async function updateWhatsAppUserInteraction(
  userId: string,
  campaignId: string,
  contactData: {
    contactId: string
    contactName: string
    phone: string
  }
) {
  try {
    const analysisRef = db
      .collection('analysis')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    const doc = await analysisRef.get()
    const currentData = doc.data() || {}
    const users = currentData.whatsapp?.users || {}

    // Store user as an object keyed by contactId
    if (!users[contactData.contactId]) {
      users[contactData.contactId] = {
        contactId: contactData.contactId,
        contactName: contactData.contactName,
        phone: contactData.phone,
        interactedAt: new Date().toISOString(),
      }
    }

    await analysisRef.update({
      'whatsapp.users': users,
      'whatsapp.totalUsers': Object.keys(users).length,
      updatedAt: new Date(),
    })

    console.log(`✅ WhatsApp user interaction updated for contact ${contactData.phone}`)
  } catch (error) {
    console.error(`❌ Error updating WhatsApp user interaction:`, error)
  }
}

/**
 * Get analysis data for a campaign
 */
export async function getAnalysisData(userId: string, campaignId: string) {
  try {
    const analysisRef = db
      .collection('analysis')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)

    const doc = await analysisRef.get()
    return doc.exists ? doc.data() : null
  } catch (error) {
    console.error(`❌ Error getting analysis data:`, error)
    return null
  }
}
