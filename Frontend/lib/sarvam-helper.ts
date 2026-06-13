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

/** Top 5 Indian languages — full Sarvam TTS + STT tuning */
export const TOP_INDIC_LANGUAGES: SupportedLanguage[] = [
  'en-IN',
  'hi-IN',
  'bn-IN',
  'ta-IN',
  'te-IN',
];

export interface SarvamLanguageProfile {
  speaker: string;
  pace: number;
  temperature: number;
}

/** Per-language voice tuning — lighter, conversational telephony */
export const SARVAM_LANGUAGE_PROFILES: Record<SupportedLanguage, SarvamLanguageProfile> = {
  'en-IN': { speaker: 'shubh', pace: 1.0, temperature: 0.9 },
  'hi-IN': { speaker: 'shubh', pace: 1.0, temperature: 0.9 },
  'bn-IN': { speaker: 'rehan', pace: 1.08, temperature: 0.92 },
  'ta-IN': { speaker: 'rohan', pace: 1.0, temperature: 0.9 },
  'te-IN': { speaker: 'shubh', pace: 1.0, temperature: 0.9 },
  'mr-IN': { speaker: 'shubh', pace: 1.0, temperature: 0.9 },
  'gu-IN': { speaker: 'shubh', pace: 1.0, temperature: 0.9 },
  'kn-IN': { speaker: 'shubh', pace: 1.0, temperature: 0.9 },
  'ml-IN': { speaker: 'shubh', pace: 1.0, temperature: 0.9 },
  'pa-IN': { speaker: 'shubh', pace: 1.0, temperature: 0.9 },
};

/** Default TTS voice — shubh = warm, lighter male (less deep than mani) */
export const SARVAM_DEFAULT_SPEAKER =
  process.env.SARVAM_TTS_SPEAKER?.trim() || 'shubh';

export function getLanguageProfile(languageCode: SupportedLanguage): SarvamLanguageProfile {
  const base = SARVAM_LANGUAGE_PROFILES[languageCode] ?? SARVAM_LANGUAGE_PROFILES['en-IN'];

  const envSpeakerByLang: Partial<Record<SupportedLanguage, string | undefined>> = {
    'en-IN': process.env.SARVAM_TTS_SPEAKER_EN?.trim(),
    'hi-IN': process.env.SARVAM_TTS_SPEAKER_HI?.trim(),
    'bn-IN': process.env.SARVAM_TTS_SPEAKER_BN?.trim(),
    'ta-IN': process.env.SARVAM_TTS_SPEAKER_TA?.trim(),
    'te-IN': process.env.SARVAM_TTS_SPEAKER_TE?.trim(),
  };

  const envSpeaker = envSpeakerByLang[languageCode]?.trim();
  if (envSpeaker) return { ...base, speaker: envSpeaker };

  return base;
}

export function getSpeakerForLanguage(languageCode: SupportedLanguage): string {
  return getLanguageProfile(languageCode).speaker;
}

export function getPaceForLanguage(languageCode: SupportedLanguage): number {
  return getLanguageProfile(languageCode).pace;
}

export function getTemperatureForLanguage(languageCode: SupportedLanguage): number {
  return getLanguageProfile(languageCode).temperature;
}

/** @deprecated Use getSpeakerForLanguage() */
export function getConsistentSpeaker(languageCode?: SupportedLanguage): string {
  return getSpeakerForLanguage(languageCode ?? 'en-IN');
}

/** @deprecated Use getConsistentSpeaker() — kept for direct API callers */
export const SARVAM_SPEAKERS: Record<SupportedLanguage, string> = {
  'en-IN': SARVAM_DEFAULT_SPEAKER,
  'hi-IN': SARVAM_DEFAULT_SPEAKER,
  'bn-IN': SARVAM_DEFAULT_SPEAKER,
  'ta-IN': SARVAM_DEFAULT_SPEAKER,
  'te-IN': SARVAM_DEFAULT_SPEAKER,
  'mr-IN': SARVAM_DEFAULT_SPEAKER,
  'gu-IN': SARVAM_DEFAULT_SPEAKER,
  'kn-IN': SARVAM_DEFAULT_SPEAKER,
  'ml-IN': SARVAM_DEFAULT_SPEAKER,
  'pa-IN': SARVAM_DEFAULT_SPEAKER,
};

/** Sarvam bulbul:v3 model (replaces deprecated bulbul:v1) */
export const SARVAM_TTS_MODEL =
  process.env.SARVAM_TTS_MODEL?.trim() || 'bulbul:v3';

/** Pace/speed for natural telephony rhythm (bulbul:v3 range 0.5–2.0) */
export function getSafeSarvamPace(): number {
  const raw = Number(process.env.SARVAM_VOICE_SPEED ?? process.env.SARVAM_TTS_PACE ?? '0.82');
  if (!Number.isFinite(raw) || raw <= 0) return 0.82;
  return Math.min(Math.max(raw, 0.55), 1.1);
}

export function getSafeSarvamTemperature(): number {
  const raw = Number(process.env.SARVAM_TTS_TEMPERATURE ?? '0.85');
  if (!Number.isFinite(raw)) return 0.85;
  return Math.min(Math.max(raw, 0.5), 1.2);
}

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

/** Detect Hinglish / Benglish when user speaks Indian languages in Latin script */
export function detectRomanizedLanguage(text: string): SupportedLanguage | null {
  if (!text?.trim()) return null;

  const lower = text.toLowerCase();

  const bengaliRoman =
    /\b(ami|apni|tumi|kemon|bhalo|bolun|bolben|bolchi|achen|ache|ki|keno|kothay|dhonnobad|nomoshkar|ektu|hobe|korbo|bolto|shunbo)\b/i;
  const hindiRoman =
    /\b(haan|han|nahi|nahin|ji|kya|kaise|theek|achha|accha|shukriya|namaste|boliye|suniye|samjhe|matlab|bataiye|milega)\b/i;
  const tamilRoman =
    /\b(vanakkam|epdi|irukku|sollunga|nandri|illai|seri|pannunga)\b/i;
  const teluguRoman =
    /\b(namaskaram|ela|undhi|cheppandi|dhanyavadam|ledu|sare)\b/i;

  const scores: Partial<Record<SupportedLanguage, number>> = {};
  if (bengaliRoman.test(lower)) scores['bn-IN'] = (scores['bn-IN'] ?? 0) + 2;
  if (hindiRoman.test(lower)) scores['hi-IN'] = (scores['hi-IN'] ?? 0) + 2;
  if (tamilRoman.test(lower)) scores['ta-IN'] = (scores['ta-IN'] ?? 0) + 2;
  if (teluguRoman.test(lower)) scores['te-IN'] = (scores['te-IN'] ?? 0) + 2;

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;
  return ranked[0][0] as SupportedLanguage;
}

/** True when text is plain English/Latin with no Indian-language roman markers */
export function isClearlyEnglish(text: string): boolean {
  if (!text?.trim()) return true;

  if (detectScriptLanguage(text) !== 'en-IN') return false;
  if (detectRomanizedLanguage(text)) return false;

  const latinLetters = (text.match(/[a-zA-Z]/g) ?? []).length;
  return latinLetters >= Math.max(3, text.length * 0.35);
}

/**
 * TTS language from assistant reply text — never stick to a prior user language.
 * Assistant script/roman cues win; plain English stays en-IN.
 */
export function resolveTtsLanguageFromText(
  assistantText: string,
  userTurn?: { text?: string; detectedLanguage?: string },
): SupportedLanguage {
  const fromScript = detectScriptLanguage(assistantText);
  if (fromScript !== 'en-IN') return fromScript;

  const fromRoman = detectRomanizedLanguage(assistantText);
  if (fromRoman) return fromRoman;

  if (isClearlyEnglish(assistantText)) return 'en-IN';

  if (userTurn?.detectedLanguage) {
    const fromDetected = resolveLanguageCode(userTurn.detectedLanguage);
    if (fromDetected !== 'en-IN') return fromDetected;
  }

  if (userTurn?.text) {
    const userScript = detectScriptLanguage(userTurn.text);
    if (userScript !== 'en-IN') return userScript;

    const userRoman = detectRomanizedLanguage(userTurn.text);
    if (userRoman) return userRoman;

    if (isClearlyEnglish(userTurn.text)) return 'en-IN';
  }

  return 'en-IN';
}

// ── Text-to-Speech ────────────────────────────────────────────────────────────

export type SarvamOutputCodec = 'wav' | 'linear16' | 'mulaw';

export interface SarvamTTSOptions {
  text: string;
  languageCode: SupportedLanguage;
  /** Sarvam speaker name. Defaults to the preset for the language. */
  speaker?: string;
  /** Sarvam TTS model. Defaults to bulbul:v3 */
  model?: string;
  /** Target sample rate in Hz. Defaults to 24000 */
  sampleRate?: number;
  /** linear16 = raw 16-bit PCM (required for Vapi custom-voice) */
  outputAudioCodec?: SarvamOutputCodec;
  /** bulbul:v3 expressiveness 0.01–2.0 — higher = more human, less flat */
  temperature?: number;
  pace?: number;
}

export interface SarvamTTSResult {
  /** Base-64 encoded audio (PCM when outputAudioCodec=linear16) */
  audioBase64: string;
  languageCode: SupportedLanguage;
  outputAudioCodec: SarvamOutputCodec;
  sampleRate: number;
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
    speaker = getSpeakerForLanguage(languageCode),
    model = SARVAM_TTS_MODEL,
    sampleRate = 24000,
    outputAudioCodec = 'wav',
    temperature = getTemperatureForLanguage(languageCode),
    pace = getPaceForLanguage(languageCode),
  } = options;

  const payload: Record<string, unknown> = {
    text,
    target_language_code: languageCode,
    speaker,
    model,
    pace,
    speech_sample_rate: sampleRate,
    output_audio_codec: outputAudioCodec,
  };

  if (model.startsWith('bulbul:v3')) {
    payload.temperature = temperature;
  } else {
    payload.pitch = 0;
    payload.loudness = 1.4;
    payload.enable_preprocessing = true;
  }

  const response = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify(payload),
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
    outputAudioCodec,
    sampleRate,
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
