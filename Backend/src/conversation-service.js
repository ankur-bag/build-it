'use strict';

const admin = require('firebase-admin');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const axios = require('axios');
const { updateAnalysisWhatsApp } = require('./analysis-service');

// ── Firebase Admin Init (from env vars, no file path needed) ─────────────────
let _db = null;

function getDb() {
  if (_db) return _db;
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  console.log(`[Conv-Service] 🔧 Firebase Init Check:`);
  console.log(`   projectId: ${projectId ? '✓ set' : '✗ MISSING'}`);
  console.log(`   clientEmail: ${clientEmail ? '✓ set' : '✗ MISSING'}`);
  console.log(`   privateKey: ${privateKey ? '✓ set' : '✗ MISSING'}`);
  
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('❌ Missing Firebase credentials - check .env vars');
  }
  
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
      });
      console.log(`[Conv-Service] ✅ Firebase initialized successfully`);
    } catch (err) {
      console.error(`[Conv-Service] ❌ Firebase init failed:`, err.message);
      throw err;
    }
  }
  _db = admin.firestore();
  return _db;
}

// ── Gemini Model ─────────────────────────────────────────────────────────────
function getModel() {
  const apiKey = process.env.GEMINI_WHATSAPP_API_KEY;
  console.log(`[Conv-Service] Gemini API Key: ${apiKey ? '✓ set' : '✗ MISSING'}`);
  
  return new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey: apiKey || '',
    temperature: 0.1,
    apiVersion: 'v1beta',
  });
}

// ── Phone Normalizer ─────────────────────────────────────────────────────────
function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  return digits;
}

// ── Find latest campaign for phone from contacts collection ──────────────────
/**
 * NEW CONTACTS COLLECTION APPROACH:
 * Queries root-level contacts/{phoneNumber} document.
 * Each contact document has:
 *   - campaigns: [{ campaignId, userId, title, description, ... }, ...]
 *   - lastCampaignId: most recent campaign ID
 *   - updatedAt: timestamp
 *
 * Returns the LATEST campaign for this phone number.
 * If multiple campaigns have contacted this number, uses lastCampaignId.
 *
 * Returns { userId, campaignId, contactId, contactPhone } or null.
 */
async function findLatestCampaignByPhone(phone) {
  const db = getDb();
  const normalizedPhone = normalizePhone(phone) || phone;

  console.log(`\n[Conv-Service] 🔍 START: findLatestCampaignByPhone("${phone}") → normalized: "${normalizedPhone}"`);
  console.log(`[Conv-Service]    📍 Querying contacts collection for this phone...`);

  try {
    // Query the contacts collection for this phone number
    const contactDocRef = db.collection("contacts").doc(normalizedPhone);
    const contactSnap = await contactDocRef.get();

    if (!contactSnap.exists) {
      console.warn(`[Conv-Service] ❌ Phone ${normalizedPhone} not found in contacts collection`);
      return null;
    }

    const contactData = contactSnap.data();
    const lastCampaignId = contactData.lastCampaignId;
    const campaigns = contactData.campaigns || [];

    console.log(`[Conv-Service]    ✓ Contact found:`);
    console.log(`[Conv-Service]      Phone: ${normalizedPhone}`);
    console.log(`[Conv-Service]      Total campaigns: ${campaigns.length}`);

    if (!lastCampaignId) {
      console.warn(`[Conv-Service] ❌ No lastCampaignId in contact document`);
      return null;
    }

    // Find the last campaign object from the campaigns array
    const lastCampaign = campaigns.find(c => c.campaignId === lastCampaignId);
    
    if (!lastCampaign) {
      console.warn(`[Conv-Service] ❌ Campaign ${lastCampaignId} not found in campaigns array`);
      return null;
    }

    console.log(`[Conv-Service]      Last campaign ID: ${lastCampaignId}`);
    console.log(`[Conv-Service]      Last campaign title: "${lastCampaign.title}"`);
    console.log(`[Conv-Service]      Campaign launched at: ${lastCampaign.launchedAt?.toISOString?.() || lastCampaign.launchedAt}`);

    // Generate contact ID
    const contactId = `contact_${normalizedPhone}_${lastCampaignId}`;

    // Load campaign data to find contact name
    let contactName = 'Unknown Contact';
    try {
      const db = getDb();
      const campaignSnap = await db
        .collection('users')
        .doc(lastCampaign.userId)
        .collection('campaigns')
        .doc(lastCampaignId)
        .get();
      
      if (campaignSnap.exists) {
        const campaignData = campaignSnap.data();
        const contacts = campaignData.contacts || campaignData.contactsSummary?.items || [];
        const contact = contacts.find((c) => 
          c.phone?.replace(/\D/g, '') === normalizedPhone.replace(/\D/g, '')
        );
        if (contact && contact.name) {
          contactName = contact.name;
        }
      }
    } catch (err) {
      console.warn(`[Conv-Service] Could not load contact name:`, err.message);
    }

    const result = {
      userId: lastCampaign.userId,
      campaignId: lastCampaignId,
      contactId,
      contactPhone: normalizedPhone,
      contactName,
    };

    console.log(`[Conv-Service] ✅ RESULT: Using LATEST campaign for ${normalizedPhone}:`, {
      userId: result.userId,
      campaignId: result.campaignId,
      contactName: result.contactName,
      title: lastCampaign.title,
    });

    return result;
  } catch (error) {
    console.error(`[Conv-Service] ❌ findLatestCampaignByPhone FATAL:`, error.message);
    console.error(error.stack);
    return null;
  }
}

// ── Load campaign context (title + description + documents) ──────────────────
async function loadCampaignContext(userId, campaignId) {
  const db = getDb();
  try {
    const campaignSnap = await db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)
      .get();

    if (!campaignSnap.exists) {
      console.warn(`⚠️ Campaign not found: ${campaignId}`);
      return { title: '', description: '', documents: '', assets: '' };
    }

    const data = campaignSnap.data();
    
    // 1. Title
    const title = data.title || '';
    console.log(`   📌 Campaign Title: "${title}"`);
    
    // 2. Description (try multiple field names)
    let description = '';
    if (data.description?.aiEnhanced) {
      description = data.description.aiEnhanced;
      console.log(`   📝 Description (aiEnhanced): ${description.length} chars`);
    } else if (data.description?.original) {
      description = data.description.original;
      console.log(`   📝 Description (original): ${description.length} chars`);
    } else if (typeof data.description === 'string') {
      description = data.description;
      console.log(`   📝 Description (string): ${description.length} chars`);
    } else if (data.description) {
      description = JSON.stringify(data.description);
      console.log(`   📝 Description (object): ${description.length} chars`);
    }

    // 3. Documents
    let documents = '';
    if (data.documents && Array.isArray(data.documents)) {
      documents = data.documents
        .map((d) => {
          if (d.extractedText) return d.extractedText;
          if (typeof d === 'string') return d;
          return JSON.stringify(d);
        })
        .filter(Boolean)
        .join('\n\n');
      console.log(`   📄 Documents: ${documents.length} chars (${data.documents.length} files)`);
    }

    // 4. Assets (images, videos, PDFs)
    let assets = '';
    if (data.assets && Array.isArray(data.assets)) {
      assets = data.assets
        .map((a) => `[${a.name || 'Asset'}: ${a.type || 'unknown'}]`)
        .join(', ');
      console.log(`   🎨 Assets: ${assets}`);
    }

    const fullContext = [title, description, documents, assets].filter(Boolean).join('\n\n');
    console.log(`   ✅ Total context: ${fullContext.length} chars`);

    return { title, description, documents, assets, fullContext };
  } catch (error) {
    console.error('❌ loadCampaignContext error:', error.message);
    console.error(error.stack);
    return { title: '', description: '', documents: '', assets: '', fullContext: '' };
  }
}

// ── Load chat history (last 20 exchanges) ────────────────────────────────────
/**
 * Mirrors loadChatHistory from campaign-langchain.ts.
 * Returns array of { input, output } exchange pairs.
 */
async function loadChatHistory(userId, campaignId, contactId) {
  const db = getDb();
  try {
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .doc(campaignId)
      .collection('inbox')
      .doc('contacts')
      .collection('contacts')
      .doc(contactId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(20)
      .get();

    const history = [];
    let lastUserMsg = '';

    snapshot.docs.forEach((doc) => {
      const d = doc.data();
      if (d.sender === 'user') {
        lastUserMsg = d.content;
      } else if ((d.sender === 'ai' || d.sender === 'campaign') && lastUserMsg) {
        history.push({ input: lastUserMsg, output: d.content });
        lastUserMsg = '';
      }
    });

    console.log(`📚 Loaded ${history.length} conversation exchanges`);
    return history;
  } catch (error) {
    console.error('❌ loadChatHistory error:', error.message);
    return [];
  }
}

// ── Save user message + AI reply to Firestore ────────────────────────────────
/**
 * Stores:
 *   - user message as sender:'user'
 *   - AI reply as sender:'campaign'
 * Also updates the contact document's lastMessage/lastMessageTime/unreadCount.
 */
async function saveChatHistory(userId, campaignId, contactId, userMessage, aiReply, phone, contactName) {
  const db = getDb();

  const contactRef = db
    .collection('users')
    .doc(userId)
    .collection('campaigns')
    .doc(campaignId)
    .collection('inbox')
    .doc('contacts')
    .collection('contacts')
    .doc(contactId);

  try {
    // Ensure contact document exists
    await contactRef.set(
      {
        contactPhone: phone,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Store user message
    const userMsgId = `user_${Date.now()}`;
    await contactRef.collection('messages').doc(userMsgId).set({
      id: userMsgId,
      sender: 'user',
      type: 'text',
      content: userMessage,
      contactPhone: phone,
      timestamp: new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Store AI reply
    const aiMsgId = `ai_${Date.now() + 1}`;
    await contactRef.collection('messages').doc(aiMsgId).set({
      id: aiMsgId,
      sender: 'campaign',
      type: 'text',
      content: aiReply,
      timestamp: new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update contact last message metadata
    await contactRef.set(
      {
        lastMessage: aiReply,
        lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
        unreadCount: admin.firestore.FieldValue.increment(1),
      },
      { merge: true }
    );

    console.log(`💾 Messages saved — user: ${userMsgId}, ai: ${aiMsgId}`);

    // Update analysis collection DIRECTLY (Backend)
    try {
      // Get all messages for this contact
      const messagesSnapshot = await contactRef.collection('messages').get();
      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Call backend analysis service directly
      const result = await updateAnalysisWhatsApp(userId, campaignId, {
        contactId,
        contactName: contactName || 'Unknown',
        phone,
        messages,
      });
      
      console.log(`✅ WhatsApp analysis updated: ${result.totalMessages} messages, ${result.totalUsers} users`);
    } catch (analysisErr) {
      console.warn(`⚠️ Failed to update WhatsApp analysis:`, analysisErr.message);
      // Don't fail the entire flow if analysis update fails
    }
  } catch (error) {
    console.error('❌ saveChatHistory error:', error.message);
  }
}

// ── Generate AI reply using Gemini ───────────────────────────────────────────
/**
 * Generates a reply based on the specific campaign context.
 * CRITICAL: Only answer questions about the campaign topic. Refuse irrelevant questions.
 */
async function generateCampaignReply(userId, campaignId, contactId, message) {
  try {
    console.log(`[Conv-Service]    🤖 Generating AI reply (CAMPAIGN-CONTEXT)...`);
    console.log(`[Conv-Service]       User: ${userId}, Campaign: ${campaignId}, Contact: ${contactId}`);

    const context = await loadCampaignContext(userId, campaignId);
    const { title, description, documents, assets, fullContext } = context;
    
    console.log(`[Conv-Service]       Context loaded: title=${title.length > 0 ? '✓' : '✗'}, desc=${description.length} chars, docs=${documents.length} chars`);

    const history = await loadChatHistory(userId, campaignId, contactId);
    console.log(`[Conv-Service]       History: ${history.length} exchanges`);

    // 🔥 CRITICAL: Strong prompt that forces context-based answers
    const prompt = `You are a professional assistant for this specific campaign.

=== CAMPAIGN CONTEXT (Your ONLY source of information) ===
Campaign Title: ${title}
${description}
${documents ? `\nDetails:\n${documents}` : ''}
${assets ? `\nResources:\n${assets}` : ''}
=== END CONTEXT ===

CRITICAL RULES:
1. ONLY answer questions about: "${title}" and related topics
2. Base ALL answers on the campaign information above
3. If a question is unrelated to the campaign, POLITELY decline and redirect to the campaign topic
4. Never provide information outside of the campaign context
5. Be specific and practical in your answers

Recent conversation history:
${history.length > 0 ? history.map((h) => `Q: ${h.input}\nA: ${h.output}`).join('\n\n') : 'No previous conversation'}

User question: "${message}"

RESPOND NOW - Stay within the campaign context. Remember: ONLY talk about "${title}":`;

    const model = getModel();
    console.log(`[Conv-Service]       📝 Prompt length: ${prompt.length} chars`);
    console.log(`[Conv-Service]       🔄 Calling Gemini API (CONTEXT-BASED)...`);
    
    const result = await model.invoke(prompt);
    const aiReply = result.content?.toString().trim() || 'I\'m here to help with questions about this campaign.';

    console.log(`[Conv-Service]       ✅ Reply generated (${aiReply.length} chars)`);
    console.log(`[Conv-Service]       📝 "${aiReply.substring(0, 100)}..."`);

    return aiReply;
  } catch (error) {
    console.error(`[Conv-Service]    ❌ generateCampaignReply FAILED:`, error.message);
    console.error(error.stack);
    return 'I apologize for the error. Please ask your question again about this campaign.';
  }
}

// ── Send WhatsApp reply ───────────────────────────────────────────────────────
async function sendWhatsAppReply(phone, content) {
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const WA_API_BASE = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  console.log(`[Conv-Service]    📤 WhatsApp config check:`);
  console.log(`[Conv-Service]       Phone ID: ${PHONE_NUMBER_ID ? '✓' : '✗'}`);
  console.log(`[Conv-Service]       Access Token: ${ACCESS_TOKEN ? '✓ set' : '✗ MISSING'}`);

  try {
    console.log(`[Conv-Service]    📤 Calling WhatsApp API...`);
    const res = await axios.post(
      WA_API_BASE,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { body: content, preview_url: false },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const msgId = res.data?.messages?.[0]?.id;
    console.log(`[Conv-Service]    ✅ WhatsApp API success, msgId: ${msgId}`);
    return msgId;
  } catch (error) {
    const errMsg = error?.response?.data?.error?.message || error.message;
    const errCode = error?.response?.data?.error?.code;
    console.error(`[Conv-Service]    ❌ WhatsApp API FAILED:`);
    console.error(`[Conv-Service]       Status: ${error?.response?.status}`);
    console.error(`[Conv-Service]       Code: ${errCode}`);
    console.error(`[Conv-Service]       Message: ${errMsg}`);
    throw error;
  }
}

// ── Main handler: called from the webhook ────────────────────────────────────
/**
 * Orchestrates the full conversation flow:
 *   1. Find the latest campaign for this phone
 *   2. Generate an AI reply based on campaign context
 *   3. Save user message + AI reply to Firestore
 *   4. Send the AI reply back via WhatsApp
 *
 * @param {string} phone     - Sender's phone (raw, will be normalised)
 * @param {string} content   - User's message text
 * @param {string} messageId - WhatsApp message ID (for deduplication)
 */
async function handleWhatsAppMessage(phone, content, messageId) {
  console.log(`\n\n${'═'.repeat(80)}`);
  console.log(`[Conv-Service] 🚀 START handleWhatsAppMessage`);
  console.log(`   Phone: "${phone}" (raw)`);
  console.log(`   Message ID: ${messageId}`);
  console.log(`   Content: "${content}"`);
  console.log(`${'═'.repeat(80)}`);

  const normalizedPhone = normalizePhone(phone) || phone;
  console.log(`[Conv-Service] Phone normalized: "${phone}" → "${normalizedPhone}"`);

  // 1. Find latest campaign
  console.log(`\n[Conv-Service] STEP 1️⃣: Finding campaign for ${normalizedPhone}...`);
  const campaign = await findLatestCampaignByPhone(normalizedPhone);

  if (!campaign) {
    console.error(`\n[Conv-Service] ❌ STEP 1 FAILED: No campaign found for ${normalizedPhone}!`);
    console.log(`[Conv-Service] 📤 Sending response indicating no campaign found...`);
    try {
      await sendWhatsAppReply(normalizedPhone, "Hi! I couldn't find an active campaign for your number. Please contact support.");
      console.log(`[Conv-Service] ✅ Reply sent`);
    } catch (err) {
      console.error(`[Conv-Service] ❌ Failed to send reply:`, err.message);
    }
    console.log(`${'═'.repeat(80)}\n`);
    return;
  }

  const { userId, campaignId, contactId, contactName } = campaign;
  console.log(`[Conv-Service] ✅ STEP 1: Campaign found!`);
  console.log(`   userId: ${userId}`);
  console.log(`   campaignId: ${campaignId}`);
  console.log(`   contactId: ${contactId}`);
  console.log(`   contactName: ${contactName}`);

  try {
    // 2. Generate AI reply based on campaign context
    console.log(`\n[Conv-Service] STEP 2️⃣: Generating AI reply using CAMPAIGN CONTEXT...`);
    const aiReply = await generateCampaignReply(userId, campaignId, contactId, content);
    console.log(`[Conv-Service] ✅ STEP 2: AI reply generated`);
    console.log(`   Length: ${aiReply.length} chars`);
    console.log(`   Preview: "${aiReply.substring(0, 100)}..."`);

    // 3. Save both messages to Firestore (same structure as frontend)
    console.log(`\n[Conv-Service] STEP 3️⃣: Saving to Firebase...`);
    await saveChatHistory(userId, campaignId, contactId, content, aiReply, normalizedPhone, contactName);
    console.log(`[Conv-Service] ✅ STEP 3: Messages saved`);

    // 4. Send AI reply back via WhatsApp
    console.log(`\n[Conv-Service] STEP 4️⃣: Sending via WhatsApp...`);
    await sendWhatsAppReply(normalizedPhone, aiReply);
    console.log(`[Conv-Service] ✅ STEP 4: Reply sent`);

    console.log(`\n[Conv-Service] ✅✅✅ COMPLETE: Message processed successfully with CAMPAIGN CONTEXT`);
    console.log(`${'═'.repeat(80)}\n`);
  } catch (error) {
    console.error(`\n[Conv-Service] ❌ FATAL ERROR in handleWhatsAppMessage:`, error.message);
    console.error(error.stack);
    console.log(`${'═'.repeat(80)}\n`);
  }
}

module.exports = {
  handleWhatsAppMessage,
  findLatestCampaignByPhone,
  generateCampaignReply,
  sendWhatsAppReply,
};
