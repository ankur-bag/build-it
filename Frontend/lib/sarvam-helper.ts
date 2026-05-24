/**
 * sarvam-helper.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utility functions that leverage the Sarvam AI API (SARVAM_API_KEY) for:
 *   1. Language detection from raw transcript text
 *   2. Text-to-speech synthesis in Indian languages
 *   3. BCP-47 ↔ Sarvam language code mapping
 *
 * Sarvam API reference: https://docs.sarvam.ai
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type SupportedLanguage =
  | 'en-IN'   // English (India)
  | 'hi-IN'   // Hindi
  | 'bn-IN'   // Bengali
  | 'ta-IN'   // Tamil
  | 'te-IN'   // Telugu
  | 'mr-IN'   // Marathi
  | 'gu-IN'   // Gujarati
  | 'kn-IN'   // Kannada
  | 'ml-IN'   // Malayalam
  | 'pa-IN';  // Punjabi

/** Maps common BCP-47 short codes → Sarvam language codes */
export const LANGUAGE_CODE_MAP: Record<string, SupportedLanguage> = {
  en:    'en-IN',
  hi:    'hi-IN',
  bn:    'bn-IN',
  ta:    'ta-IN',
  te:    'te-IN',
  mr:    'mr-IN',
  gu:    'gu-IN',
  kn:    'kn-IN',
  ml:    'ml-IN',
  pa:    'pa-IN',
  // Deepgram "multi" returns full BCP-47 — pass-through if already valid
  'en-IN': 'en-IN',
  'hi-IN': 'hi-IN',
  'bn-IN': 'bn-IN',
  'ta-IN': 'ta-IN',
  'te-IN': 'te-IN',
  'mr-IN': 'mr-IN',
  'gu-IN': 'gu-IN',
  'kn-IN': 'kn-IN',
  'ml-IN': 'ml-IN',
  'pa-IN': 'pa-IN',
};

/** Sarvam TTS speaker presets for each language */
const SARVAM_SPEAKERS: Record<SupportedLanguage, string> = {
  'en-IN': 'meera',
  'hi-IN': 'meera',
  'bn-IN': 'meera',
  'ta-IN': 'meera',
  'te-IN': 'meera',
  'mr-IN': 'meera',
  'gu-IN': 'meera',
  'kn-IN': 'meera',
  'ml-IN': 'meera',
  'pa-IN': 'meera',
};

// ── Language Detection ────────────────────────────────────────────────────────

/**
 * Resolves a raw Deepgram language code (e.g. "hi", "bn", "en-IN") to a
 * canonical Sarvam language code. Falls back to "en-IN" if unrecognised.
 */
export function resolveLanguageCode(rawCode: string | undefined | null): SupportedLanguage {
  if (!rawCode) return 'en-IN';
  const clean = rawCode.trim().toLowerCase();
  return LANGUAGE_CODE_MAP[clean] ?? 'en-IN';
}

/**
 * Simple heuristic: detects whether a string is likely Hindi, Bengali,
 * Tamil, Telugu, or Marathi by checking Unicode script ranges.
 * Useful when language metadata is not available.
 */
export function detectScriptLanguage(text: string): SupportedLanguage {
  if (!text || text.trim().length === 0) return 'en-IN';

  const counts: Record<SupportedLanguage, number> = {
    'en-IN': 0,
    'hi-IN': 0,
    'bn-IN': 0,
    'ta-IN': 0,
    'te-IN': 0,
    'mr-IN': 0,
    'gu-IN': 0,
    'kn-IN': 0,
    'ml-IN': 0,
    'pa-IN': 0,
  };

  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    if (cp >= 0x0900 && cp <= 0x097F) counts['hi-IN']++;  // Devanagari (Hindi/Marathi shared)
    if (cp >= 0x0980 && cp <= 0x09FF) counts['bn-IN']++;  // Bengali
    if (cp >= 0x0B80 && cp <= 0x0BFF) counts['ta-IN']++;  // Tamil
    if (cp >= 0x0C00 && cp <= 0x0C7F) counts['te-IN']++;  // Telugu
    if (cp >= 0x0A80 && cp <= 0x0AFF) counts['gu-IN']++;  // Gujarati
    if (cp >= 0x0C80 && cp <= 0x0CFF) counts['kn-IN']++;  // Kannada
    if (cp >= 0x0D00 && cp <= 0x0D7F) counts['ml-IN']++;  // Malayalam
    if (cp >= 0x0A00 && cp <= 0x0A7F) counts['pa-IN']++;  // Gurmukhi (Punjabi)
    if ((cp >= 0x0041 && cp <= 0x007A) || (cp >= 0x0061 && cp <= 0x007A)) counts['en-IN']++;
  }

  // Pick the language with the highest script character count
  const sorted = (Object.entries(counts) as [SupportedLanguage, number][]).sort((a, b) => b[1] - a[1]);
  // If no non-English script detected, return English
  if (sorted[0][0] === 'en-IN' || sorted[0][1] === 0) return 'en-IN';
  return sorted[0][0];
}

// ── Text-to-Speech ────────────────────────────────────────────────────────────

export interface SarvamTTSOptions {
  text: string;
  languageCode: SupportedLanguage;
  /** Sarvam speaker name. Defaults to the preset for the language. */
  speaker?: string;
  /** Sarvam TTS model. Defaults to "bulbul:v1" */
  model?: string;
  /** Target sample rate in Hz. Defaults to 24000 */
  sampleRate?: number;
}

export interface SarvamTTSResult {
  /** Base-64 encoded WAV audio */
  audioBase64: string;
  languageCode: SupportedLanguage;
}

/**
 * Synthesises speech using the Sarvam AI TTS API.
 *
 * @throws  Error if SARVAM_API_KEY is missing or the API call fails.
 */
export async function synthesiseSpeech(options: SarvamTTSOptions): Promise<SarvamTTSResult> {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY is not configured in environment variables.');
  }

  const {
    text,
    languageCode,
    speaker = SARVAM_SPEAKERS[languageCode] ?? 'meera',
    model = 'bulbul:v1',
    sampleRate = 24000,
  } = options;

  const response = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: languageCode,
      speaker,
      model,
      pitch: 0,
      pace: 1.0,
      loudness: 1.5,
      enable_preprocessing: true,
      sample_rate: sampleRate,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sarvam TTS API error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  if (!data.audios || !data.audios[0]) {
    throw new Error('Sarvam TTS API returned no audio data.');
  }

  return {
    audioBase64: data.audios[0] as string,
    languageCode,
  };
}

// ── Speech-to-Text (Transcription) ───────────────────────────────────────────

export interface SarvamSTTResult {
  transcript: string;
  languageCode: SupportedLanguage;
  confidence?: number;
}

/**
 * Transcribes audio using the Sarvam AI STT API.
 * Accepts a Buffer of raw audio data (WAV recommended).
 *
 * @throws Error if SARVAM_API_KEY is missing or the API call fails.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  languageCode: SupportedLanguage = 'hi-IN',
  model: string = 'saarika:v2',
): Promise<SarvamSTTResult> {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY is not configured in environment variables.');
  }

  const formData = new FormData();
  // Guarantee a plain ArrayBuffer (not SharedArrayBuffer) for Blob compatibility
  const plainArrayBuffer = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength,
  ) as ArrayBuffer;
  const audioBlob = new Blob([plainArrayBuffer], { type: 'audio/wav' });
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', model);
  formData.append('language_code', languageCode);

  const response = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sarvam STT API error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  return {
    transcript: data.transcript ?? '',
    languageCode: resolveLanguageCode(data.language_code) ?? languageCode,
    confidence: data.confidence,
  };
}

// ── Helper for Vapi Webhook ───────────────────────────────────────────────────

/**
 * Extracts the detected language from a Vapi transcript message.
 * Deepgram "multi" mode returns a `detectedLanguage` field on the
 * transcript object. Falls back to script detection if not present.
 *
 * Usage in your webhook handler:
 *   const lang = extractDetectedLanguage(message.transcript);
 */
export function extractDetectedLanguage(
  transcript: { text?: string; detectedLanguage?: string } | null | undefined,
): SupportedLanguage {
  if (!transcript) return 'en-IN';

  // Prefer Deepgram-provided language code
  if (transcript.detectedLanguage) {
    return resolveLanguageCode(transcript.detectedLanguage);
  }

  // Fallback: heuristic Unicode script detection
  return detectScriptLanguage(transcript.text ?? '');
}
