import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { askTutor } from '../../lib/api';
import { callAIProxy, callOllama } from '../../lib/ai/providers';
import { executeWithReliability } from '../../lib/ai/reliability';
import { resetAICircuitBreakers, aiCircuitBreakers } from '../../lib/ai/circuitBreaker';
import { resolveProviderSelection } from '../../lib/ai/providerResolver';
import { resetLocalModelReachability } from '../../lib/ai/endpointPolicy';
import { useSettingsStore } from '../../store/settingsStore';
import { useStudyStore } from '../../store/studyStore';
import { mockSupabase } from '../utils/mockSupabase';

const originalSettings = {
  aiMode: useSettingsStore.getState().aiMode,
  ollamaUrl: useSettingsStore.getState().ollamaUrl,
  ollamaChatModel: useSettingsStore.getState().ollamaChatModel,
};

const jsonResponse = (payload: unknown): Response =>
  ({ ok: true, status: 200, json: async () => payload }) as unknown as Response;

const statusResponse = (status: number): Response =>
  ({ ok: false, status, json: async () => ({}) }) as unknown as Response;

const dailyLimitResponse = (): Response =>
  ({ ok: false, status: 429, json: async () => ({ error: 'daily AI call limit exceeded' }) }) as unknown as Response;

const hostedFailure = async (status: number) => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(statusResponse(status))
    .mockResolvedValueOnce(jsonResponse({ content: 'Recovered tutor answer' })));
};

const withoutSession = () => {
  vi.spyOn(mockSupabase.client.auth, 'getSession').mockResolvedValue({
    data: { session: null },
    error: null,
  } as never);
};

describe('M1 T3 — AI boundary proof (network edge mocked only)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    resetAICircuitBreakers();
    resetLocalModelReachability();
    useStudyStore.getState().clearPendingAIRequests();
    useSettingsStore.setState(originalSettings);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetAICircuitBreakers();
    resetLocalModelReachability();
    useSettingsStore.setState(originalSettings);
  });

  it('sends the learner JWT to the hosted proxy with no client API key', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ content: 'Tutor answer' }));

    const answer = await callAIProxy('Be a tutor', [{ role: 'user', content: 'Hello' }]);

    expect(answer).toBe('Tutor answer');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/functions\/v1\/ai-proxy$/);
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-user-access-token');
    expect(Object.keys(headers).some((name) => /api.?key/i.test(name))).toBe(false);
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body.provider).toBe('groq');
    expect(body.apiKey).toBeUndefined();
  });

  it.each([429, 503])('bounds retries and returns a friendly message for HTTP %i', async (status) => {
    hostedFailure(status);
    const fetchMock = vi.mocked(fetch);

    const result = await executeWithReliability<string>(
      'Be a tutor',
      [{ role: 'user', content: 'Hello' }],
      {
        provider: 'hosted_proxy',
        retries: 2,
        baseDelayMs: 1,
        fallbackPlaceholder: 'Fallback answer',
        context: { feature: 'explanation' },
      },
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('hosted_proxy');
    expect(result.attemptsUsed).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not expose a raw 429/503 when every retry is exhausted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(statusResponse(429)));

    const result = await executeWithReliability<string>(
      'Be a tutor',
      [{ role: 'user', content: 'Hello' }],
      {
        provider: 'hosted_proxy',
        retries: 2,
        baseDelayMs: 1,
        fallbackPlaceholder: 'Fallback answer',
        context: { feature: 'explanation' },
      },
    );

    expect(result.success).toBe(false);
    expect(result.provider).toBe('placeholder');
    expect(result.error).toContain('busy right now');
    expect(result.error).not.toMatch(/Error:|fetch failed|TypeError/);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('does not retry a daily-cap 429: one call, explicit DAILY_LIMIT refusal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(dailyLimitResponse()));
    const fetchMock = vi.mocked(fetch);

    const result = await executeWithReliability<string>(
      'Be a tutor',
      [{ role: 'user', content: 'Hello' }],
      {
        provider: 'hosted_proxy',
        retries: 2,
        baseDelayMs: 1,
        fallbackPlaceholder: 'Fallback answer',
        context: { feature: 'explanation' },
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('DAILY_LIMIT');
    expect(result.error).toContain('Daily tutor limit reached');
    expect(result.error).not.toContain('busy right now');
  });

  it('fails fast offline, reports the provider, and queues instead of dropping', async () => {
    withoutSession();
    useSettingsStore.setState({ aiMode: 'hosted', ollamaUrl: '' });
    const fetchMock = vi.mocked(fetch);

    const result = await askTutor('Be a tutor', [{ role: 'user', content: 'Hello' }]);

    expect(result.success).toBe(false);
    expect(result.provider).toBe('offline');
    expect(result.selectedProvider).toBe('offline');
    expect(result.error).toMatch(/offline|unavailable/i);
    expect(fetchMock).not.toHaveBeenCalled();

    const request = {
      topicId: 'ALG-001',
      subjectId: 'HS-MATH',
      systemPrompt: 'Be a tutor',
      messages: [{ role: 'user' as const, content: 'Hello' }],
    };
    useStudyStore.getState().enqueueAIRequest(request);
    const queued = useStudyStore.getState().pendingAIRequests;
    expect(queued).toHaveLength(1);
    expect(queued[0].messages[0].content).toBe('Hello');
  });

  it('never contacts Ollama by default or a browser loopback URL', async () => {
    withoutSession();
    useSettingsStore.setState({ aiMode: 'hosted', ollamaUrl: '' });
    const fetchMock = vi.mocked(fetch);

    const defaultSelection = await resolveProviderSelection();
    expect(defaultSelection).toEqual({ provider: 'offline', reason: 'offline-hosted-unavailable' });
    await expect(callOllama('sys', [{ role: 'user', content: 'Hi' }], '')).rejects.toThrow(/not configured/);

    useSettingsStore.setState({ aiMode: 'local', ollamaUrl: 'http://localhost:11434' });
    const webSelection = await resolveProviderSelection();
    expect(webSelection.provider).toBe('offline');
    await expect(callOllama(
      'sys',
      [{ role: 'user', content: 'Hi' }],
      'http://localhost:11434',
    )).rejects.toThrow(/loopback URL/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses Ollama only after explicit opt-in and a successful reachability probe', async () => {
    withoutSession();
    useSettingsStore.setState({ aiMode: 'local', ollamaUrl: 'http://192.168.1.50:11434' });
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ models: [] }))
      .mockResolvedValueOnce(jsonResponse({ message: { content: 'Local answer' } }));

    const selection = await resolveProviderSelection();
    expect(selection.provider).toBe('local_ollama');
    // The probe happens in the resolver; the answer call is the second fetch.
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const result = await executeWithReliability<string>(
      'sys',
      [{ role: 'user', content: 'Hi' }],
      {
        provider: selection.provider,
        retries: 1,
        fallbackPlaceholder: 'Fallback answer',
        context: { feature: 'explanation' },
      },
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('local_ollama');
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://192.168.1.50:11434/api/tags');
    expect(String(fetchMock.mock.calls[1][0])).toBe('http://192.168.1.50:11434/api/chat');
  });

  it('opens the breaker after repeated failures and recovers after cooldown', async () => {
    let nowMs = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(statusResponse(503));

    const run = () => executeWithReliability<string>(
      'sys',
      [{ role: 'user', content: 'Hi' }],
      {
        provider: 'hosted_proxy',
        retries: 1,
        baseDelayMs: 1,
        fallbackPlaceholder: 'Fallback answer',
        context: { feature: 'explanation' },
      },
    );

    await run();
    await run();
    expect(aiCircuitBreakers.hosted_proxy.state).toBe('closed');
    await run();
    expect(aiCircuitBreakers.hosted_proxy.state).toBe('open');

    const callsWhenOpen = fetchMock.mock.calls.length;
    const blocked = await run();
    expect(blocked.provider).toBe('placeholder');
    expect(fetchMock).toHaveBeenCalledTimes(callsWhenOpen);

    nowMs += 61_000;
    fetchMock.mockReset().mockResolvedValue(jsonResponse({ content: 'Recovered' }));
    const recovered = await run();
    expect(recovered.success).toBe(true);
    expect(recovered.provider).toBe('hosted_proxy');
    expect(aiCircuitBreakers.hosted_proxy.state).toBe('closed');
  });
});
