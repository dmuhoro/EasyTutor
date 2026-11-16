// Groq provider configuration — single source of truth for the model allowlist,
// default model, and provider health checks. Mirrored in
// supabase/functions/ai-proxy/index.ts (MODEL_ALLOWLIST).
import { SYSTEM_CONFIG } from '../src/config/registry';

export const GROQ_MODEL_ALLOWLIST: readonly string[] = SYSTEM_CONFIG.GROQ.MODEL_ALLOWLIST;
export const GROQ_DEFAULT_MODEL: string = SYSTEM_CONFIG.GROQ.DEFAULT_MODEL;

export const isGroqModelAllowed = (model: string): boolean =>
  GROQ_MODEL_ALLOWLIST.includes(model as any);

export const resolveGroqModel = (requested?: string): string => {
  if (requested && isGroqModelAllowed(requested)) return requested;
  return GROQ_DEFAULT_MODEL;
};

/**
 * Health-check the Groq provider via the ai-proxy edge function. Returns
 * { ok, model, error } so the UI can show a friendly message when the provider
 * is unreachable or the model is not callable on the current plan.
 */
export async function groqHealthCheck(
  supabaseUrl: string,
  anonKey: string,
  accessToken: string,
): Promise<{ ok: boolean; model?: string; error?: string }> {
  const model = GROQ_DEFAULT_MODEL;
  const url = supabaseUrl.replace(/\/+$/, '');

  try {
    const res = await fetch(`${url}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        provider: 'groq',
        model,
        systemPrompt: 'health check',
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });

    if (!res.ok) {
      return { ok: false, model, error: `ai-proxy returned HTTP ${res.status}` };
    }

    const raw = await res.json();
    if (raw?.error) {
      return { ok: false, model, error: String(raw.error) };
    }

    return { ok: true, model };
  } catch (err: any) {
    return {
      ok: false,
      model,
      error: err?.message ?? 'Groq provider unreachable',
    };
  }
}
