import { NextRequest, NextResponse } from 'next/server';
import {
  synthesiseSpeech,
  resolveLanguageCode,
  resolveTtsLanguageFromText,
  getSpeakerForLanguage,
  getPaceForLanguage,
  getTemperatureForLanguage,
  TOP_INDIC_LANGUAGES,
} from '@/lib/sarvam-helper';

export const runtime = 'nodejs';
export const maxDuration = 30;

function normalizeVapiSampleRate(rate?: number): number {
  const allowed = [8000, 16000, 22050, 24000];
  if (rate && allowed.includes(rate)) return rate;
  return 8000;
}

/**
 * POST /api/sarvam/tts
 * Vapi custom-voice endpoint — returns raw 16-bit little-endian PCM (linear16).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body?.message?.type === 'voice-request') {
      const { text, sampleRate, call } = body.message as {
        text: string;
        sampleRate?: number;
        call?: { transcript?: { text?: string; detectedLanguage?: string } };
      };

      if (!text?.trim()) {
        return new NextResponse('Missing text in voice-request', { status: 400 });
      }

      const languageCode = resolveTtsLanguageFromText(text, call?.transcript);
      const vapiSampleRate = normalizeVapiSampleRate(sampleRate);
      const speaker = getSpeakerForLanguage(languageCode);

      console.log(
        `🎙️ Vapi→Sarvam | lang=${languageCode} speaker=${speaker} | "${text.slice(0, 80)}..."`,
      );

      const result = await synthesiseSpeech({
        text,
        languageCode,
        speaker,
        sampleRate: vapiSampleRate,
        outputAudioCodec: 'linear16',
        pace: getPaceForLanguage(languageCode),
        temperature: getTemperatureForLanguage(languageCode),
      });

      const pcmBuffer = Buffer.from(result.audioBase64, 'base64');

      return new NextResponse(pcmBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(pcmBuffer.byteLength),
        },
      });
    }

    const { text, languageCode: rawLang } = body as {
      text?: string;
      languageCode?: string;
    };

    if (!text) {
      return NextResponse.json({ error: 'Missing required field: text' }, { status: 400 });
    }

    const languageCode = resolveLanguageCode(rawLang);
    const result = await synthesiseSpeech({ text, languageCode });

    return NextResponse.json({
      success: true,
      languageCode: result.languageCode,
      audioBase64: result.audioBase64,
      encoding: result.outputAudioCodec,
      sampleRate: result.sampleRate,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sarvam TTS synthesis failed';
    console.error('❌ Sarvam TTS Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const hasSarvamKey = !!process.env.SARVAM_API_KEY?.trim();
  return NextResponse.json({
    endpoint: '/api/sarvam/tts',
    status: 'ok',
    assistant: process.env.VAPI_ASSISTANT_NAME?.trim() || 'Rohan',
    sarvamConfigured: hasSarvamKey,
    defaultSpeaker: process.env.SARVAM_TTS_SPEAKER?.trim() || 'shubh',
    vapiFormat: 'linear16 PCM (16-bit LE mono)',
    topIndicLanguages: TOP_INDIC_LANGUAGES,
    supportedLanguages: TOP_INDIC_LANGUAGES.concat(['mr-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN']),
  });
}
