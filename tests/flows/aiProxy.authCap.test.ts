import { describe, it, expect } from 'vitest';
import { handleProxyRequest, type ProxyEnv } from '../../supabase/functions/ai-proxy/handler';
import { GROQ_CHAT_ENDPOINT } from '../../supabase/functions/ai-proxy/health';

// C11 — real-path proof for the ai-proxy auth and per-learner daily cap.
// Only the network socket is stubbed; the production handler (the same module
// index.ts delegates to) performs auth, the atomic cap RPC and the provider
// call unchanged. These assertions guard the boundary that keeps one learner
// from spending another learner's AI budget.

const SUPABASE = 'https://project.supabase.co';

function env(): ProxyEnv {
  return {
    SUPABASE_URL: SUPABASE,
    SERVICE_ROLE_KEY: 'service-role-test-value',
    GROQ_API_KEY: 'groq-test-value',
    SUPABASE_ANON_KEY: 'anon-test-value',
  };
}

interface StubOptions {
  authStatus?: number;
  authBody?: unknown;
  rpcStatus?: number;
  rpcBody?: unknown;
}

function stubFetch(opts: StubOptions = {}) {
  const urls: string[] = [];
  const rpcBodies: Record<string, unknown>[] = [];
  const rpcHeaders: Record<string, string>[] = [];
  const authHeaders: Record<string, string>[] = [];
  const providerCalls = 0;

  const impl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    urls.push(url);
    const headers = Object.fromEntries(
      Object.entries(init?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value)]),
    );

    if (url.endsWith('/auth/v1/user')) {
      authHeaders.push(headers);
      return new Response(JSON.stringify(opts.authBody ?? { id: 'learner-1' }), {
        status: opts.authStatus ?? 200,
      });
    }
    if (url.includes('/rpc/increment_daily_ai_calls')) {
      rpcBodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
      rpcHeaders.push(headers);
      return new Response(
        typeof opts.rpcBody === 'number' ? String(opts.rpcBody) : JSON.stringify(opts.rpcBody ?? 1),
        { status: opts.rpcStatus ?? 200 },
      );
    }
    if (url === GROQ_CHAT_ENDPOINT) {
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'answer' } }] }),
        { status: 200 },
      );
    }
    if (url.includes('/ai_call_logs')) return new Response('{}', { status: 201 });
    throw new Error(`unexpected fetch: ${url}`);
  };

  return {
    fetchImpl: impl as typeof fetch,
    urls,
    rpcBodies,
    rpcHeaders,
    authHeaders,
    providerCallCount: () => urls.filter((url) => url === GROQ_CHAT_ENDPOINT).length,
    initialProviderCalls: providerCalls,
  };
}

function post(headers: Record<string, string> = {}, body: Record<string, unknown> = {}) {
  return new Request(`${SUPABASE}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer learner-jwt',
      ...headers,
    },
    body: JSON.stringify({
      provider: 'groq',
      messages: [{ role: 'user', content: 'hi' }],
      // A caller must never be able to attribute the call to another learner.
      userId: 'attacker-controlled',
      ...body,
    }),
  });
}

describe('ai-proxy auth and daily cap (C11)', () => {
  it('rejects an invalid JWT before the cap RPC or the provider', async () => {
    const stub = stubFetch({ authStatus: 401, authBody: { message: 'invalid' } });
    const res = await handleProxyRequest(post(), env(), stub.fetchImpl);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid jwt' });
    expect(stub.rpcBodies).toHaveLength(0);
    expect(stub.providerCallCount()).toBe(0);
  });

  it('rejects a successful auth response with no usable user id', async () => {
    const stub = stubFetch({ authBody: { email: 'no-id@example.test' } });
    const res = await handleProxyRequest(post(), env(), stub.fetchImpl);
    expect(res.status).toBe(401);
    expect(stub.rpcBodies).toHaveLength(0);
    expect(stub.providerCallCount()).toBe(0);
  });

  it('stamps the cap RPC with the authenticated learner, never the caller body', async () => {
    const stub = stubFetch({ rpcBody: 7 });
    const res = await handleProxyRequest(post(), env(), stub.fetchImpl);
    expect(res.status).toBe(200);
    expect(stub.rpcBodies).toHaveLength(1);
    expect(stub.rpcBodies[0]).toMatchObject({
      p_user_id: 'learner-1',
    });
    expect(stub.rpcBodies[0].p_user_id).not.toBe('attacker-controlled');
    expect(stub.rpcHeaders[0].authorization).toBe('Bearer service-role-test-value');
    // Auth must use the anon key, not the service role.
    expect(stub.authHeaders[0].apikey).toBe('anon-test-value');
  });

  it('allows the 200th call and reaches the provider exactly once', async () => {
    const stub = stubFetch({ rpcBody: 200 });
    const res = await handleProxyRequest(post(), env(), stub.fetchImpl);
    expect(res.status).toBe(200);
    expect(stub.providerCallCount()).toBe(1);
  });

  it('refuses the 201st call and never reaches the provider', async () => {
    const stub = stubFetch({ rpcBody: 201 });
    const res = await handleProxyRequest(post(), env(), stub.fetchImpl);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'daily AI call limit exceeded' });
    expect(stub.providerCallCount()).toBe(0);
  });

  it('fails closed when the atomic cap RPC itself fails', async () => {
    const stub = stubFetch({ rpcStatus: 500, rpcBody: { message: 'db down' } });
    await expect(handleProxyRequest(post(), env(), stub.fetchImpl)).rejects.toThrow(
      /daily cap RPC failed/,
    );
    expect(stub.providerCallCount()).toBe(0);
  });
});
