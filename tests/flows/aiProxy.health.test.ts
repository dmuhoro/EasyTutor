import { describe, it, expect } from 'vitest';
import {
  checkProxyHealth,
  GROQ_MODELS_ENDPOINT,
  GROQ_CHAT_ENDPOINT,
} from '../../supabase/functions/ai-proxy/health';

// Real-path proof for W1-2e: the ai-proxy /health probe must derive the model
// from the provider's live model list intersected with the allowlist, never
// from a name hardcoded in memory. Only the network socket is stubbed; the
// production checkProxyHealth function runs unchanged.
const ALLOWLIST = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
// The model the old hardcoded health probe always pinged (allowlist entry 0).
const DEFAULT_MODEL = ALLOWLIST[0];
const LIVE_ONLY_MODEL = 'llama-3.3-70b-versatile';

function stubFetch(opts: {
  models?: { status: number; body: unknown };
  chatOkFor?: string;
  throwOnChatWith?: string;
} = {}) {
  const calls: Array<{ url: string; model?: string }> = [];
  const impl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    if (url === GROQ_MODELS_ENDPOINT) {
      calls.push({ url });
      const models = opts.models ?? {
        status: 200,
        body: { data: [{ id: 'brand-new-live-model' }, { id: LIVE_ONLY_MODEL }] },
      };
      return new Response(JSON.stringify(models.body), { status: models.status });
    }
    if (url === GROQ_CHAT_ENDPOINT) {
      const model = JSON.parse(String(init?.body)).model as string;
      calls.push({ url, model });
      if (opts.throwOnChatWith && model === opts.throwOnChatWith) {
        throw new Error(`upstream failed with sk-leak-secret model=${model}`);
      }
      const ok = model === (opts.chatOkFor ?? LIVE_ONLY_MODEL);
      return new Response('{}', { status: ok ? 200 : 404 });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };
  return { fetchImpl: impl as typeof fetch, calls };
}

async function health(overrides: Partial<Parameters<typeof checkProxyHealth>[0]>) {
  return checkProxyHealth({
    groqApiKey: 'test-key',
    modelAllowlist: ALLOWLIST,
    ...overrides,
  });
}

describe('ai-proxy health uses the live model list (W1-2e)', () => {
  it('returns a friendly 503 when no provider key is configured, without fetching', async () => {
    const { fetchImpl, calls } = stubFetch();
    const res = await health({ groqApiKey: '', fetchImpl });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(String(body.error).toLowerCase()).toContain('key');
    expect(calls).toHaveLength(0);
  });

  it('probes a live allowlisted model and never the hardcoded default model', async () => {
    const { fetchImpl, calls } = stubFetch();
    // The live list contains only LIVE_ONLY_MODEL from the allowlist; the old
    // hardcoded DEFAULT_MODEL is absent (deprecated upstream).
    expect(LIVE_ONLY_MODEL).not.toBe(DEFAULT_MODEL);
    const res = await health({ fetchImpl });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.model).toBe(LIVE_ONLY_MODEL);
    const chatCall = calls.find((c) => c.url === GROQ_CHAT_ENDPOINT);
    expect(chatCall?.model).toBe(LIVE_ONLY_MODEL);
    expect(chatCall?.model).not.toBe(DEFAULT_MODEL);
  });

  it('reports 503 with no probe when no allowlisted model is available', async () => {
    const { fetchImpl, calls } = stubFetch({
      models: { status: 200, body: { data: [{ id: 'some-unlisted-model' }] } },
    });
    const res = await health({ fetchImpl });
    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
    expect(calls.some((c) => c.url === GROQ_CHAT_ENDPOINT)).toBe(false);
  });

  it('reports 502 when the provider model list is unavailable', async () => {
    const { fetchImpl, calls } = stubFetch({ models: { status: 500, body: {} } });
    const res = await health({ fetchImpl });
    expect(res.status).toBe(502);
    expect((await res.json()).ok).toBe(false);
    expect(calls.some((c) => c.url === GROQ_CHAT_ENDPOINT)).toBe(false);
  });

  it('never echoes a raw upstream error (no key/secret leakage)', async () => {
    const { fetchImpl } = stubFetch({ throwOnChatWith: LIVE_ONLY_MODEL });
    const res = await health({ fetchImpl });
    const raw = await res.text();
    expect(raw).not.toContain('sk-leak-secret');
    expect(raw).not.toContain('test-key');
  });
});
