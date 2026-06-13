/**
 * Public base URL for this deployment.
 * Used for Vapi Sarvam TTS, webhooks, and voice callbacks.
 */
export function getPublicAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const voiceBase = process.env.VOICE_BASE_URL?.trim();
  if (voiceBase) return voiceBase.replace(/\/$/, '');

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}

export function getSarvamTtsPublicUrl(): string {
  const explicit = process.env.VAPI_SARVAM_TTS_URL?.trim();
  if (explicit) return explicit;

  return `${getPublicAppUrl()}/api/sarvam/tts`;
}
