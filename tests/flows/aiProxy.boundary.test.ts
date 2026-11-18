import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { askTutor } from '../../lib/api';
import { useSettingsStore } from '../../store/settingsStore';
import { mockSupabase } from '../utils/mockSupabase';

// Real-path proof for T2: a Learn question must reach the server ai-proxy and
// must never attempt a loopback model server. Only the auth token lookup and
// the network socket are stubbed; `askTutor`, `getAIResponse` and
// `callAIProxy` run their production code.
describe('AI boundary: Learn question reaches ai-proxy with localhost blocked', () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  beforeEach(() => {
    mockSupabase.reset();
    calls.length = 0;
    useSettingsStore.setState({
      aiMode: 'hosted',
      // A legacy persisted loopback URL must still not be contacted.
      ollamaUrl: 'http://127.0.0.1:11434',
    });
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (/localhost|127\.0\.0\.1|\[::1\]/.test(url)) {
        throw new Error('loopback fetch blocked by test policy');
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ content: 'grounded proxy answer' }),
      } as Response;
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends the question to /functions/v1/ai-proxy and never to localhost', async () => {
    const result = await askTutor('You are a tutor.', [
      { role: 'user', content: 'What is a linear equation?' },
    ]);

    expect(result.success).toBe(true);
    expect(result.data).toBe('grounded proxy answer');
    const proxyCalls = calls.filter((call) => call.url.endsWith('/functions/v1/ai-proxy'));
    expect(proxyCalls.length).toBe(1);
    expect(calls.some((call) => /localhost|127\.0\.0\.1|\[::1\]/.test(call.url))).toBe(false);
    const body = JSON.parse(String(proxyCalls[0].init?.body));
    expect(body.messages[0].content).toContain('linear equation');
  });
});
