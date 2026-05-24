import { NextRequest, NextResponse } from 'next/server';
import { synthesiseSpeech, resolveLanguageCode, detectScriptLanguage, type SupportedLanguage } from '@/lib/sarvam-helper';

/**
 * POST /api/sarvam/tts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dual-purpose Sarvam AI TTS endpoint:
 *
 *  1. **Vapi Custom Voice** — When Vapi sends a voice-request message, this
 *     route synthesises audio using Sarvam AI and returns raw WAV/PCM audio so
 *     Vapi can play it back to the caller.
 *
 *  2. **Direct API** — Any other caller can POST:
 *        { "text": "...", "languageCode": "hi-IN" }
 *     and receive a JSON response with base-64 audio.
 *
 * To configure Vapi to use this endpoint as a custom voice, set:
 *   voice: {
 *     provider: "custom-voice",
 *     server: { url: "https://YOUR_DOMAIN/api/sarvam/tts" }
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Vapi Custom Voice Protocol ──────────────────────────────────────────
    // Vapi sends: { message: { type: "voice-request", text: "...", ... } }
    if (body?.message?.type === 'voice-request') {
      const { text, call } = body.message as {
        text: string;
        sampleRate?: number;
        call?: { transcript?: { text?: string; detectedLanguage?: string } };
      };

      if (!text) {
        return new NextResponse('Missing text in voice-request', { status: 400 });
      }

      // Determine language from the live call transcript / Deepgram detection
      let languageCode: SupportedLanguage = 'en-IN';
      const detectedLang = call?.transcript?.detectedLanguage;
      if (detectedLang) {
        languageCode = resolveLanguageCode(detectedLang);
      } else if (call?.transcript?.text) {
        languageCode = detectScriptLanguage(call.transcript.text);
      }

      console.log(`🌐 Sarvam TTS (Vapi) — lang: ${languageCode}, text length: ${text.length}`);

      const result = await synthesiseSpeech({
        text,
        languageCode,
        sampleRate: 8000, // Telephone quality (Vapi telephony standard)
      });

      // Decode base64 → Buffer and stream raw audio back to Vapi
      const audioBuffer = Buffer.from(result.audioBase64, 'base64');

      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': String(audioBuffer.byteLength),
        },
      });
    }

    // ── Direct API call ─────────────────────────────────────────────────────
    // Body: { text: string, languageCode?: string }
    const { text, languageCode: rawLang } = body as {
      text?: string;
      languageCode?: string;
    };

    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 },
      );
    }

    const languageCode = resolveLanguageCode(rawLang);

    console.log(`🌐 Sarvam TTS (Direct) — lang: ${languageCode}, text: "${text.slice(0, 60)}..."`);

    const result = await synthesiseSpeech({ text, languageCode });

    return NextResponse.json({
      success: true,
      languageCode: result.languageCode,
      audioBase64: result.audioBase64,
      encoding: 'wav',
    });

  } catch (error: any) {
    console.error('❌ Sarvam TTS Error:', error.message);
    return NextResponse.json(
      { error: error.message ?? 'Sarvam TTS synthesis failed' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/sarvam/tts
 * Health-check / info endpoint.
 */
export async function GET() {
  const hasSarvamKey = !!process.env.SARVAM_API_KEY?.trim();
  return NextResponse.json({
    endpoint: '/api/sarvam/tts',
    status: 'ok',
    sarvamConfigured: hasSarvamKey,
    supportedLanguages: [
      'en-IN', 'hi-IN', 'bn-IN', 'ta-IN',
      'te-IN', 'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN',
    ],
    vapiCompatible: true,
    usage: {
      direct: 'POST { "text": "...", "languageCode": "hi-IN" }',
      vapi: 'Set voice.provider="custom-voice" and voice.server.url to this endpoint URL',
    },
  });
}
