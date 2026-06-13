import { uploadRawAudioBuffer } from './cloudinary';
import { synthesiseSpeech, getLanguageProfile } from './sarvam-helper';
import { getSarvamTtsPublicUrl } from './app-url';
import { env, validateVapiCallEnv } from './vapi-env';

export interface OutboundCallRequest {
  customerPhoneNumber: string;
  customerName?: string;
  campaignTitle: string;
  campaignDescription: string;
  docsText?: string;
  orderedQuestions?: string[];
  userId: string;
  campaignId: string;
  /**
   * Override language for STT. Defaults to "multi" (auto-detect).
   * Pass a BCP-47 code (e.g. "hi", "bn", "ta") to force a specific language.
   */
  sttLanguage?: string;
}

const ASSISTANT_NAME = env('VAPI_ASSISTANT_NAME') || 'Rohan';

const CALL_CONNECTED_STATUSES = new Set(['ringing', 'in-progress', 'forwarding']);
const CALL_ACTIVE_STATUSES = new Set(['queued', 'ringing', 'in-progress', 'forwarding']);
const CALL_POLL_INTERVAL_MS = 500;
const CALL_POLL_TIMEOUT_MS = 20000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function formatVapiCallError(call: {
  endedMessage?: string;
  endedReason?: string;
  customer?: { number?: string };
}): string {
  const detail = call.endedMessage || call.endedReason || 'Call failed before connecting';
  const phone = call.customer?.number || 'recipient';

  if (/unverified|trial account/i.test(detail)) {
    return (
      `Twilio trial account cannot call ${phone} — verify this number in Twilio Console ` +
      `(Phone Numbers → Verified Caller IDs) or upgrade your Twilio account. ${detail}`
    );
  }

  return detail;
}

/** Poll Vapi until the call rings/connects or fails (API returns 200 before Twilio dials). */
async function waitForCallConnection(callId: string, vapiApiKey: string): Promise<void> {
  const deadline = Date.now() + CALL_POLL_TIMEOUT_MS;
  let sawActive = false;

  while (Date.now() < deadline) {
    await wait(CALL_POLL_INTERVAL_MS);

    const res = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { Authorization: `Bearer ${vapiApiKey}` },
    });

    if (!res.ok) continue;

    const call = (await res.json()) as {
      status?: string;
      endedMessage?: string;
      endedReason?: string;
      customer?: { number?: string };
    };

    if (call.status && CALL_ACTIVE_STATUSES.has(call.status)) {
      sawActive = true;
    }

    if (call.status && CALL_CONNECTED_STATUSES.has(call.status)) {
      console.log(`   📱 Call status: ${call.status}`);
      return;
    }

    if (call.status === 'ended') {
      throw new Error(formatVapiCallError(call));
    }
  }

  if (!sawActive) {
    throw new Error(
      'Call never left queued state — check VAPI_API_KEY and VAPI_NUMBER_ID on this deployment (Vercel env vars).',
    );
  }

  console.warn(`   ⚠️ Call ${callId} still queued after ${CALL_POLL_TIMEOUT_MS / 1000}s — check Vapi dashboard`);
}

/** Resolve Sarvam custom-voice URL for Vapi (must be publicly reachable). */
function getSarvamTtsUrl(): string | null {
  if (env('VAPI_USE_SARVAM_TTS') === 'false') return null;
  if (!env('SARVAM_API_KEY')) return null;
  return getSarvamTtsPublicUrl();
}

/**
 * Pre-synthesize intro as hosted WAV — Vapi plays this instantly on answer
 * instead of waiting for custom-voice round-trip (fixes silent pickup).
 */
async function prepareFirstMessageAudio(firstMessage: string): Promise<string | null> {
  if (!env('SARVAM_API_KEY')) return null;

  try {
    const profile = getLanguageProfile('en-IN');
    const result = await synthesiseSpeech({
      text: firstMessage,
      languageCode: 'en-IN',
      speaker: profile.speaker,
      sampleRate: 8000,
      outputAudioCodec: 'wav',
      pace: profile.pace,
      temperature: profile.temperature,
    });

    const buffer = Buffer.from(result.audioBase64, 'base64');
    const url = await uploadRawAudioBuffer(buffer, 'outreachx-voice/intros', {
      publicId: `intro_${Date.now()}`,
      format: 'wav',
    });

    console.log('   🎵 Intro audio pre-synthesized → plays immediately on answer');
    return url;
  } catch (error) {
    console.warn(
      '   ⚠️ Intro pre-synthesis failed, falling back to live TTS:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/** Short conversational snippet for the spoken intro (not a wall of text). */
function buildCampaignIntroSnippet(description: string, maxLen = 140): string {
  const clean = description.replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  if (clean.length <= maxLen) return clean;

  const snippet = clean.slice(0, maxLen);
  const lastSpace = snippet.lastIndexOf(' ');
  const trimmed = lastSpace > 80 ? snippet.slice(0, lastSpace) : snippet;
  return `${trimmed.trimEnd()}.`;
}

function buildFirstMessage(
  campaignTitle: string,
  campaignDescription: string,
  greetingName?: string,
): string {
  const intro = buildCampaignIntroSnippet(campaignDescription);
  const greeting = greetingName?.trim()
    ? `Hi ${greetingName.trim()}, this is ${ASSISTANT_NAME}.`
    : `Hi, this is ${ASSISTANT_NAME}.`;

  return (
    `${greeting} ` +
    `I'm calling about ${campaignTitle}. ` +
    (intro ? `${intro} ` : '') +
    `Do you have a quick minute to chat?`
  );
}

function buildVoiceConfig() {
  const useSarvam = env('VAPI_USE_SARVAM_TTS') !== 'false' && !!env('SARVAM_API_KEY');
  const sarvamUrl = getSarvamTtsUrl();

  if (useSarvam && sarvamUrl) {
    return {
      config: {
        provider: 'custom-voice',
        server: {
          url: sarvamUrl,
          timeoutSeconds: 18,
        },
        chunkPlan: {
          enabled: true,
          minCharacters: 8,
        },
      },
      label: `sarvam/bulbul:v3 (${env('SARVAM_TTS_SPEAKER') || 'shubh'})`,
    };
  }

  // Fallback: ElevenLabs multilingual — warmer settings than default Adam
  return {
    config: {
      provider: '11labs',
      voiceId: process.env.VAPI_ELEVENLABS_VOICE_ID?.trim() || 'pNInz6obpgDQGcFmaJgB',
      model: 'eleven_multilingual_v2',
      stability: 0.35,
      similarityBoost: 0.8,
      useSpeakerBoost: true,
    },
    label: '11labs/eleven_multilingual_v2 (fallback — set VAPI_SARVAM_TTS_URL for Indian voice)',
  };
}

/**
 * Triggers an outbound call using Vapi.ai and Twilio
 */
export async function triggerOutboundCall({
  customerPhoneNumber,
  customerName,
  campaignTitle,
  campaignDescription,
  docsText,
  orderedQuestions,
  userId,
  campaignId,
  sttLanguage = 'multi',
}: OutboundCallRequest) {
  const vapiApiKey = env('VAPI_API_KEY');
  const vapiPhoneNumberId = env('VAPI_NUMBER_ID');

  const envCheck = validateVapiCallEnv();
  if (!envCheck.ok) {
    throw new Error(
      `Missing env on this deployment: ${envCheck.missing.join(', ')}. ` +
        'Add them in Vercel → Project → Settings → Environment Variables.',
    );
  }

  const firstMessageText = buildFirstMessage(campaignTitle, campaignDescription, customerName);

  const questionsList =
    orderedQuestions && orderedQuestions.length > 0
      ? orderedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
      : 'No specific questions provided. Conduct a general discovery conversation.';

  const multilingualInstructions = `
LANGUAGE RULES — HIGHEST PRIORITY
1. Match the user's LAST message only — not earlier turns.
   - Last msg English → reply in English (Latin). Even if they spoke Hindi before.
   - Last msg Hindi → reply in Devanagari. Even if they spoke English before.
   - Last msg Bengali → reply in বাংলা script. Tamil/Telugu → native script.
2. Switch instantly when they switch. Never announce it. Never stay in Hindi after they speak English.
3. Examples:
   User (Hindi): "हाँ बोलिए" → You: "बढ़िया! ${campaignTitle} के बारे में था — एक मिनट मिलेगा?"
   User (then English): "Yes tell me more" → You: "Sure! It's on April 4th in Kolkata — hackathons and workshops."
   User (Bengali): "হ্যাঁ বলুন" → You: "অবশ্যই! ${campaignTitle} নিয়ে ফোন করেছিলাম।"
4. Write non-English in native script (not romanized). Keep replies under 20 words. Be warm, casual, Indian.
5. Intro already played — don't repeat it. Unclear audio? Ask to repeat in their current language.
`;

  const systemPrompt = `${multilingualInstructions}

You are ${ASSISTANT_NAME} — a warm, human-like Indian outbound calling agent.

Your name is always ${ASSISTANT_NAME}. Introduce yourself as ${ASSISTANT_NAME} only if the user asks who is calling.
You already introduced yourself in the opening message — do NOT repeat "My name is ${ASSISTANT_NAME}" unless asked.

The conversation runs through structured steps:
- Call Opening (intro + time check — opening already done via firstMessage)
- Campaign Questions
- Knowledge Responses
- Call Outro

Your job: speak naturally at each step. The system decides flow — you don't skip or reorder steps.

--------------------------------
CAMPAIGN CONTEXT
--------------------------------
Campaign Title: ${campaignTitle}
Campaign Description: ${campaignDescription}
Campaign Knowledge Documents:
${docsText || 'No additional documents available.'}

Ordered Campaign Questions:
${questionsList}

Summarize campaign info conversationally. Never read long blocks verbatim.

--------------------------------
CALL FLOW AFTER INTRO
--------------------------------
1. The firstMessage ALREADY played — you introduced yourself, gave a brief on ${campaignTitle}, and asked for a minute.
2. Do NOT re-introduce yourself. Do NOT repeat the campaign pitch verbatim.
3. WAIT for the user to respond to the intro before asking any campaign question.
4. If they say yes / haan / okay — briefly acknowledge ("Great, thanks!" / "Achha, shukriya!") then ask question 1.
5. If they're busy — politely end. Don't push.
6. Ask ONE campaign question at a time. Wait for answer. Brief ack, then next question.

--------------------------------
PERSONALITY — ROHAN
--------------------------------
• Warm, upbeat young Indian guy (~25) — friendly and relaxed, NOT deep/serious/grave
• Sounds like a helpful friend calling, not a bank officer or news reader
• Light energy, natural smile in tone — never stiff or intimidating

--------------------------------
SPEECH STYLE
--------------------------------
• Max 15 words per reply — ultra short, snappy
• One question at a time — no long monologues
• React to what they said before asking the next thing
• "Got it", "Achha theek hai", "Thanks for sharing" — then continue

--------------------------------
CAMPAIGN QUESTIONS
--------------------------------
• Ask each question as provided, one at a time
• Don't skip, reorder, or invent questions
• Off-topic? Brief answer from knowledge, return to current question

--------------------------------
HANDLING INTERRUPTIONS
--------------------------------
Answer briefly from campaign knowledge, then return to the current question.

--------------------------------
WHATSAPP DELIVERY
--------------------------------
If user asks to send details on WhatsApp:
• Confirm you'll send to the same number they're calling from
• Keep it short, continue the call

--------------------------------
IF YOU DON'T KNOW
--------------------------------
"I'm sorry, I don't have that detail right now — one of our team will get back to you."
Never say "I'll call you back."

--------------------------------
OBJECTION / BUSY
--------------------------------
Not interested: "No problem at all, thanks for your time." One light follow-up max, then end gracefully.
Busy: "Totally understand, no worries!" End politely — don't continue questions.

--------------------------------
PRIMARY GOAL
--------------------------------
Short, natural conversation to gauge interest in the campaign. Be ${ASSISTANT_NAME} — human, helpful, Indian.`;

  try {
    const assistantName =
      ASSISTANT_NAME.length <= 40 ? ASSISTANT_NAME : ASSISTANT_NAME.slice(0, 40);

    const { config: voiceConfig, label: voiceLabel } = buildVoiceConfig();

    console.log('\n🌐 MULTILINGUAL VAPI CONFIG — ROHAN');
    console.log(`   Assistant   → ${assistantName}`);
    console.log('   STT         → deepgram/nova-3/multi');
    console.log(`   TTS         → ${voiceLabel}`);
    console.log(`   Sarvam URL  → ${getSarvamTtsUrl() ?? 'n/a'}`);
    console.log('   Endpointing → 200ms');
    console.log('   FirstMessage:', firstMessageText.slice(0, 100) + '...');
    console.log('────────────────────────────────────────────\n');

    if (
      process.env.SARVAM_API_KEY?.trim() &&
      !getSarvamTtsUrl() &&
      process.env.VAPI_USE_SARVAM_TTS !== 'false'
    ) {
      console.warn(
        '⚠️ SARVAM_API_KEY is set but VAPI_SARVAM_TTS_URL / public NEXT_PUBLIC_APP_URL missing — using ElevenLabs fallback. Set VAPI_SARVAM_TTS_URL to your deployed /api/sarvam/tts URL for authentic Indian voice.',
      );
    }

    console.log('   Pre-synthesizing intro audio (instant playback on answer)...');
    const firstMessageAudioUrl = await prepareFirstMessageAudio(firstMessageText);
    const firstMessageForVapi = firstMessageAudioUrl ?? firstMessageText;

    if (getSarvamTtsUrl()) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      fetch(getSarvamTtsUrl()!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: { type: 'voice-request', text: 'Okay.', sampleRate: 8000 },
        }),
      }).catch(() => undefined);
    }

    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId: vapiPhoneNumberId,
        metadata: {
          userId,
          campaignId,
          assistantName: ASSISTANT_NAME,
        },
        customer: {
          number: customerPhoneNumber,
          name: customerName,
        },
        assistant: {
          name: assistantName,
          firstMessage: firstMessageForVapi,
          firstMessageMode: 'assistant-speaks-first',
          firstMessageInterruptionsEnabled: false,
          voicemailDetection: 'off',
          startSpeakingPlan: {
            waitSeconds: 0.15,
            transcriptionEndpointingPlan: {
              onPunctuationSeconds: 0.15,
              onNoPunctuationSeconds: 0.55,
              onNumberSeconds: 0.3,
            },
          },

          transcriber: {
            provider: 'deepgram',
            model: 'nova-3',
            language: sttLanguage === 'multi' ? 'multi' : sttLanguage,
            smartFormat: true,
            endpointing: 200,
          },

          model: {
            provider: 'openai',
            model: process.env.VAPI_LLM_MODEL?.trim() || 'gpt-4o-mini',
            maxTokens: 70,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
            ],
            temperature: 0.55,
          },

          voice: voiceConfig,

          endCallPhrases: ['goodbye', 'bye bye', 'alvida', 'dhanyavaad bye', 'বিদায়'],
          backgroundSound: 'off',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Vapi Outbound Call Failed - ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    const callId = data.id as string | undefined;

    if (callId) {
      await waitForCallConnection(callId, vapiApiKey);
    }

    console.log('\n✅ VAPI CALL CONNECTED — ROHAN');
    console.log('   Call ID   :', callId ?? 'unknown');
    console.log('   Phone     :', customerPhoneNumber);
    console.log('   Campaign  :', campaignTitle);
    console.log(`   TTS       : ${voiceLabel}`);
    console.log('────────────────────────────────────────────\n');
    return data;
  } catch (error) {
    console.error('Error triggering outbound call:', error);
    throw error;
  }
}
