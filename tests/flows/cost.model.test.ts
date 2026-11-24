import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { executeWithReliability } from '../../lib/ai/reliability';
import { callAIProxy, callOllama } from '../../lib/ai/providers';
import { resetAICircuitBreakers } from '../../lib/ai/circuitBreaker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Native platform keeps the local rail reachable for the zero-cost assertion.
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

// Mock only the two network leaves; keep the real ProviderHttpError class so
// retry classification is exercised rather than replaced.
vi.mock('../../lib/ai/providers', async () => {
  const actual = await vi.importActual<typeof import('../../lib/ai/providers')>(
    '../../lib/ai/providers',
  );
  return { ...actual, callAIProxy: vi.fn(), callOllama: vi.fn() };
});

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      aiMode: 'local',
      ollamaUrl: 'http://localhost:11434',
      ollamaChatModel: 'qwen2.5:1.5b',
    }),
  },
}));

const schema = z.object({ explanation: z.string() });
const placeholder = { explanation: 'syllabus baseline' };

/**
 * E6 acceptance: the reported cost must come from real token counts, not a
 * hardcoded zero, when a hosted rail actually ran — and must stay zero when no
 * hosted spend occurred. These assert exact values from the published Groq
 * rates (input 5e-8 USD/token, output 8e-8 USD/token).
 */
describe('AI cost model (E6 acceptance)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetAICircuitBreakers();
    AsyncStorage.clear();
  });

  it('charges exact token-based cost when the hosted proxy answers', async () => {
    // system 'SYS' (3) + user 'QQQQQQQ' (7) = 10 chars -> ceil(10/4) = 3 input tokens
    // response '{"explanation":"abcdefgh"}' = 28 chars -> ceil(28/4) = 7 output tokens
    // 3 * 5e-8 + 7 * 8e-8 = 7.1e-7 USD
    vi.mocked(callAIProxy).mockResolvedValueOnce(
      JSON.stringify({ explanation: 'abcdefgh' }),
    );

    const result = await executeWithReliability(
      'SYS',
      [{ role: 'user', content: 'QQQQQQQ' }],
      {
        provider: 'hosted_proxy',
        validationSchema: schema,
        fallbackPlaceholder: placeholder,
        retries: 1,
        context: { feature: 'explanation' },
      },
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('hosted_proxy');
    expect(result.estimatedCostUsd).toBeGreaterThan(0);
    expect(result.estimatedCostUsd).toBeCloseTo(0.00000071, 12);
    expect(callAIProxy).toHaveBeenCalledTimes(1);
  });

  it('reports zero cost for local inference — no hosted spend occurred', async () => {
    vi.mocked(callOllama).mockResolvedValueOnce(
      JSON.stringify({ explanation: 'local answer' }),
    );

    const result = await executeWithReliability(
      'SYS',
      [{ role: 'user', content: 'Q' }],
      {
        provider: 'local_ollama',
        validationSchema: schema,
        fallbackPlaceholder: placeholder,
        retries: 1,
        context: { feature: 'explanation' },
      },
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('local_ollama');
    expect(callOllama).toHaveBeenCalledTimes(1);
    expect(callAIProxy).not.toHaveBeenCalled();
    expect(result.estimatedCostUsd).toBe(0);
  });

  it('reports zero cost when a failed rail falls back to a validated cache entry', async () => {
    // Cache is a fallback, not the first link in the chain: the hosted rail
    // must be attempted (and fail) before the cached answer can be served.
    vi.mocked(callAIProxy).mockRejectedValueOnce(new Error('proxy unavailable'));
    await AsyncStorage.setItem(
      'cost-model-cache-hit',
      JSON.stringify({ explanation: 'cached answer' }),
    );

    const result = await executeWithReliability(
      'SYS',
      [{ role: 'user', content: 'Q' }],
      {
        provider: 'hosted_proxy',
        cacheKey: 'cost-model-cache-hit',
        validationSchema: schema,
        fallbackPlaceholder: placeholder,
        retries: 1,
        context: { feature: 'explanation' },
      },
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('cache');
    expect(callAIProxy).toHaveBeenCalledTimes(1);
    expect(result.estimatedCostUsd).toBe(0);
  });
});
