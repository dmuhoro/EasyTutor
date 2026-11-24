import { describe, it, expect } from 'vitest';
import { handleProxyRequest, type ProxyEnv } from '../../supabase/functions/ai-proxy/handler';
import { GROQ_CHAT_ENDPOINT } from '../../supabase/functions/ai-proxy/health';

// Real-path proof for GT-01: the ai-proxy request handler itself (the function index.ts
// delegates to) must answer CORS preflight and attach CORS headers to every response,
// including error paths. Only the network socket is stubbed; auth, rate limit, allowlists
// and response shapes are the production handler unchanged.

const ALLOWED = 'https://app.example.com, https://admin.example.com';
const APP = 'https://app.example.com';
const OTHER = 'https://evil.example.com';

function env(overrides: Partial<ProxyEnv> = {}): ProxyEnv {
  return {
    SUPABASE_URL: 'https://project.supabase.co',
    SERVICE_ROLE_KEY: 'service-role-test-value',
    GROQ_API_KEY: 'groq-test-value',
    SUPABASE_ANON_KEY: 'anon-test-value',
    ALLOWED_ORIGINS: ALLOWED,
    ...overrides,
  };
}

function stubFetch(opts: { callCount?: number; upstreamStatus?: number } = {}) {
  const urls: string[] = [];
  const impl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    urls.push(url);
    if (url.endsWith('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'learner-1' }), { status: 200 });
    }
    if (url.includes('/rpc/increment_daily_ai_calls')) {
      return new Response(String(opts.callCount ?? 1), { status: 200 });
    }
    if (url === GROQ_CHAT_ENDPOINT) {
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'a cited answer' } }] }),
        { status: opts.upstreamStatus ?? 200 },
      );
    }
    if (url.includes('/ai_call_logs')) return new Response('{}', { status: 201 });
    throw new Error(`unexpected fetch: ${url}`);
  };
  return { fetchImpl: impl as typeof fetch, urls };
}

function post(origin?: string, headers: Record<string, string> = {}) {
  const h: Record<string, string> = { 'content-type': 'application/json', authorization: 'Bearer jwt-test', ...headers };
  if (origin) h.origin = origin;
  return new Request('https://project.supabase.co/functions/v1/ai-proxy', {
    method: 'POST', headers: h,
    body: JSON.stringify({ provider: 'groq', systemPrompt: 'be helpful', messages: [{ role: 'user', content: 'hi' }] }),
  });
}

describe('ai-proxy CORS (GT-01)', () => {
  it('answers an allowed-origin preflight with 204 and the exact reflected origin', async () => {
    const { fetchImpl, urls } = stubFetch();
    const res = await handleProxyRequest(
      new Request('https://project.supabase.co/functions/v1/ai-proxy', {
        method: 'OPTIONS', headers: { origin: APP, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type,authorization,x-client-info,apikey' },
      }),
      env(), fetchImpl,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(APP);
    expect(res.headers.get('vary')).toContain('Origin');
    const allowHeaders = (res.headers.get('access-control-allow-headers') || '').toLowerCase();
    for (const header of ['authorization', 'x-client-info', 'apikey', 'content-type']) {
      expect(allowHeaders).toContain(header);
    }
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    expect(res.headers.get('access-control-allow-methods')).toContain('OPTIONS');
    expect(urls).toEqual([]); // preflight must never reach auth or the provider
  });

  it('does not reflect a disallowed origin and never emits a wildcard', async () => {
    const { fetchImpl } = stubFetch();
    const res = await handleProxyRequest(
      new Request('https://project.supabase.co/functions/v1/ai-proxy', { method: 'OPTIONS', headers: { origin: OTHER } }),
      env(), fetchImpl,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect(res.headers.get('vary')).toContain('Origin');
    const wildcard = await handleProxyRequest(
      new Request('https://project.supabase.co/functions/v1/ai-proxy', { method: 'OPTIONS', headers: { origin: OTHER } }),
      env({ ALLOWED_ORIGINS: '*' }), fetchImpl,
    );
    expect(wildcard.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('emits no CORS headers when ALLOWED_ORIGINS is missing or empty', async () => {
    const { fetchImpl } = stubFetch();
    for (const value of [undefined, '', '   ', ',,' ]) {
      const res = await handleProxyRequest(
        new Request('https://project.supabase.co/functions/v1/ai-proxy', { method: 'OPTIONS', headers: { origin: APP } }),
        env({ ALLOWED_ORIGINS: value }), fetchImpl,
      );
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    }
  });

  it('keeps the non-POST, non-OPTIONS 405 contract and carries CORS headers', async () => {
    const { fetchImpl, urls } = stubFetch();
    const res = await handleProxyRequest(
      new Request('https://project.supabase.co/functions/v1/ai-proxy', { method: 'GET', headers: { origin: APP } }),
      env(), fetchImpl,
    );
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: 'method' });
    expect(res.headers.get('access-control-allow-origin')).toBe(APP);
    expect(urls).toEqual([]);
  });

  it('adds the allow-origin header to a successful POST without changing the body', async () => {
    const { fetchImpl } = stubFetch();
    const res = await handleProxyRequest(post(APP), env(), fetchImpl);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ content: 'a cited answer' });
    expect(res.headers.get('access-control-allow-origin')).toBe(APP);
    expect(res.headers.get('vary')).toContain('Origin');
  });

  it('adds the allow-origin header to POST errors (401 and 502)', async () => {
    const noJwt = new Request('https://project.supabase.co/functions/v1/ai-proxy', {
      method: 'POST', headers: { origin: APP, 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'groq', messages: [{ role: 'user', content: 'hi' }] }),
    });
    const unauthorized = await handleProxyRequest(noJwt, env(), stubFetch().fetchImpl);
    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.json()).toEqual({ error: 'no jwt' });
    expect(unauthorized.headers.get('access-control-allow-origin')).toBe(APP);

    const upstream = await handleProxyRequest(post(APP), env(), stubFetch({ upstreamStatus: 500 }).fetchImpl);
    expect(upstream.status).toBe(502);
    expect(await upstream.json()).toEqual({ error: 'upstream provider error' });
    expect(upstream.headers.get('access-control-allow-origin')).toBe(APP);
  });

  it('adds the allow-origin header to a rate-limited POST and to a POST from a disallowed origin', async () => {
    const limited = await handleProxyRequest(post(APP), env(), stubFetch({ callCount: 201 }).fetchImpl);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('access-control-allow-origin')).toBe(APP);

    const disallowed = await handleProxyRequest(post(OTHER), env(), stubFetch().fetchImpl);
    expect(disallowed.status).toBe(200);
    expect(disallowed.headers.get('access-control-allow-origin')).toBeNull();
  });
});
