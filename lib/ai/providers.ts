// Provider rail — plain HTTP calls to the two permitted model backends.
//
// This module is a leaf: it depends on configuration helpers and the Supabase
// client boundary only, never on the reliability layer, the learning flow or a
// UI store. Direct-from-client Groq/Anthropic rails are archived and cannot be
// reached from production code (scripts/qa/check-ai-boundary.mjs enforces it).

import { normalizeOllamaUrl, resolveOllamaModel, OllamaModelRole } from '../ollamaModels';
import { isLoopbackUrl, isLocalModelServerReachable, isWebRuntime } from './endpointPolicy';
import { getSupabaseClient } from '../supabaseOps';
import type { ModelProvider } from './providerSelection';

export type AIChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/** A typed provider failure; reliability uses `retryable` for bounded backoff. */
export class ProviderHttpError extends Error {
  readonly retryable: boolean;

  constructor(
    readonly provider: ModelProvider,
    readonly status: number,
    message: string,
    retryable: boolean = status === 429 || status >= 500,
  ) {
    super(`${message} (status ${status})`);
    this.name = 'ProviderHttpError';
    this.retryable = retryable;
  }
}

/**
 * The proxy's daily cap is exhausted. Retrying would call the capped RPC again
 * and cannot change the answer, so this failure is deliberately non-retryable.
 * Carries no credential or learner data — only the server's refusal reason.
 */
export class DailyLimitError extends ProviderHttpError {
  constructor() {
    super(
      'hosted_proxy',
      429,
      'Daily tutor limit reached. Switch to offline practice.',
      false,
    );
    this.name = 'DailyLimitError';
  }
}

const DAILY_LIMIT_SERVER_MESSAGE = 'daily AI call limit exceeded';

/** Read the proxy's refusal reason without logging or echoing the raw body. */
const proxyRefusalReason = async (res: Response): Promise<string> => {
  try {
    const body: unknown = await res.json();
    if (typeof body === 'object' && body !== null) {
      const error = (body as { error?: unknown }).error;
      if (typeof error === 'string') return error;
    }
  } catch {
    // A non-JSON error body is not a reason to fail open or expose the body.
  }
  return '';
};

const friendlyProxyError = (status: number): string => {
  if (status === 429) return 'The tutor service is busy right now. We will retry shortly.';
  if (status >= 500) return 'The tutor service is temporarily unavailable. We will retry shortly.';
  return 'The tutor service could not answer that request. Please try again.';
};

const textFromJson = (raw: unknown): string => {
  if (typeof raw !== 'object' || raw === null) return '';
  const record = raw as Record<string, unknown>;
  const content = record.content ?? record.message;
  return typeof content === 'string' ? content : '';
};

/** Server-side proxy client: the browser sends only the learner's Supabase JWT. */
export async function callAIProxy(systemPrompt: string, messages: AIChatMessage[]): Promise<string> {
  const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const url = rawUrl.replace(/\/+$/, '');
  const client = getSupabaseClient();
  const { data } = await client.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('no Supabase session');

  const res = await fetch(`${url}/functions/v1/ai-proxy`, {
    method: 'POST',
    // No client API key: the Groq credential lives only in the edge function.
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ provider: 'groq', systemPrompt, messages }),
  });
  if (!res.ok) {
    if (res.status === 429 && (await proxyRefusalReason(res)) === DAILY_LIMIT_SERVER_MESSAGE) {
      throw new DailyLimitError();
    }
    throw new ProviderHttpError('hosted_proxy', res.status, friendlyProxyError(res.status));
  }
  return textFromJson(await res.json());
}

/** Opt-in local Ollama client; never contacted unless the resolver enabled it. */
export async function callOllama(
  systemPrompt: string,
  messages: AIChatMessage[],
  ollamaUrl: string,
  modelRole: OllamaModelRole = 'reasoning',
  jsonMode = false,
  configuredModelId?: string,
): Promise<string> {
  const model = resolveOllamaModel(modelRole, configuredModelId);
  const base = normalizeOllamaUrl(ollamaUrl);
  // Fail closed before any network call: empty URL, web loopback, and an
  // unreachable server all produce an explicit error, never a silent fallback
  // or a request to a relative URL.
  if (!base) {
    throw new Error('[ollama] local model server URL is not configured. Enable local AI in Settings and set a LAN URL.');
  }
  if (isWebRuntime() && isLoopbackUrl(base)) {
    throw new Error(`[ollama] loopback URL "${base}" is not reachable from a browser. Use a LAN URL.`);
  }
  if (!(await isLocalModelServerReachable(base))) {
    throw new Error(`[ollama] local model server at ${base} is unreachable; local AI is not available.`);
  }
  const endpoint = `${base}/api/chat`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: false,
        ...(jsonMode ? { format: 'json' } : {}),
      }),
    });
  } catch (networkErr) {
    const detail = networkErr instanceof Error ? networkErr.message : String(networkErr);
    throw new Error(`[ollama] ${modelRole} call to ${endpoint} failed (network): ${detail}`, {
      cause: networkErr,
    });
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        `[ollama:not_pulled] Model "${model}" (role: ${modelRole}) is not pulled on Ollama (${base}). Run: ollama pull ${model}`,
      );
    }
    throw new ProviderHttpError('local_ollama', res.status,
      `Local model request failed for ${modelRole}`);
  }
  const raw: unknown = await res.json();
  if (typeof raw !== 'object' || raw === null) return '';
  const record = raw as Record<string, unknown>;
  const message = record.message;
  if (typeof message !== 'object' || message === null) return '';
  const content = (message as Record<string, unknown>).content;
  return typeof content === 'string' ? content : '';
}
