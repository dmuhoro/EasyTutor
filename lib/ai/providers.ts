// Provider rail — plain HTTP calls to the model backends.
//
// This module is a leaf: it depends on configuration helpers only, never on the
// reliability layer, the learning flow, or any store. Keeping the providers
// here breaks the `lib/api` ⇄ `lib/ai/reliability` import cycle while leaving the
// public `lib/api` surface unchanged (it re-exports the functions below).

import { normalizeOllamaUrl, resolveOllamaModel, OllamaModelRole } from '../ollamaModels';
import { isLoopbackUrl, isLocalModelServerReachable, isWebRuntime } from './endpointPolicy';

export type AIChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// Server-side proxy client: talks to the ai-proxy Supabase function, which holds the Groq key.
export async function callAIProxy(systemPrompt: string, messages: AIChatMessage[]): Promise<string> {
  const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const url = rawUrl.replace(/\/+$/, '');
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, anon);
  const { data }: any = await client.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('no Supabase session');

  const res = await fetch(`${url}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ provider: 'groq', systemPrompt, messages }),
  });
  if (!res.ok) throw new Error(`ai-proxy ${res.status}`);
  const raw = await res.json();
  return raw?.content || raw?.message || '';
}

export async function callOllama(
  systemPrompt: string,
  messages: AIChatMessage[],
  ollamaUrl: string,
  modelRole: OllamaModelRole = 'reasoning',
  jsonMode = false,
  configuredModelId?: string,
): Promise<string> {
  // Role-based routing: the model is the user's configured model for that role
  // (or the registry default). never from a free-text setting. A call always
  // names its true model in errors.
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
      // Fail closed: name the missing model and the fix. Never silently swap it.
      throw new Error(
        `[ollama:not_pulled] Model "${model}" (role: ${modelRole}) is not pulled on Ollama (${base}). Run: ollama pull ${model}`,
      );
    }
    throw new Error(`[ollama] ${modelRole} call to ${endpoint} failed: HTTP ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  return raw.message?.content ?? '';
}

export async function callAnthropicFetch(
  systemPrompt: string,
  messages: AIChatMessage[],
  apiKey: string,
): Promise<string> {
  // Plain fetch to the Messages API — the same on-device-proven rail shape the
  // Groq rail uses. Never the Node-bound @anthropic-ai/sdk in an Expo Go bundle.
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error: ${res.statusText}`);
  const raw = await res.json();
  return raw.content?.[0]?.type === 'text' ? raw.content[0].text : '';
}

export async function callAnthropic(
  systemPrompt: string,
  messages: AIChatMessage[],
): Promise<string> {
  throw new Error(
    'Anthropic direct-from-client rail is disabled: use the server-side proxy. ' +
    'The legacy client Anthropic key rail has been removed.',
  );
}
