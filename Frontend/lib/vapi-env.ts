/** Trim env values — handles accidental spaces/quotes in .env files */
export function env(name: string): string {
  const raw = process.env[name];
  if (!raw) return '';
  return raw.trim().replace(/^["']|["']$/g, '');
}

export function validateVapiCallEnv(): { ok: true } | { ok: false; missing: string[] } {
  const required = ['VAPI_API_KEY', 'VAPI_NUMBER_ID', 'SARVAM_API_KEY'] as const;
  const missing = required.filter((key) => !env(key));

  if (missing.length > 0) {
    return { ok: false, missing: [...missing] };
  }
  return { ok: true };
}
