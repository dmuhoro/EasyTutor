import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeWithReliability } from '../../lib/ai/reliability';
import { callAIProxy } from '../../lib/ai/providers';
import { resetAICircuitBreakers } from '../../lib/ai/circuitBreaker';
import { z } from 'zod';

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('../../lib/ai/providers', async () => {
  const actual = await vi.importActual<typeof import('../../lib/ai/providers')>(
    '../../lib/ai/providers',
  );
  return { ...actual, callAIProxy: vi.fn(), callOllama: vi.fn() };
});
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ aiMode: 'hosted', ollamaUrl: '', ollamaChatModel: 'qwen2.5:1.5b' }),
  },
}));

const schema = z.object({ answer: z.string() });

describe('C43 — real token-derived cost telemetry', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetAICircuitBreakers();
    useSettingsStoreReset();
  });

  function useSettingsStoreReset() { /* store is mocked above; nothing to persist */ }

  it('charges hosted tokens and reports a non-zero, deterministic cost', async () => {
    const response = JSON.stringify({ answer: 'A'.repeat(400) });
    vi.mocked(callAIProxy).mockResolvedValueOnce(response);
    const result = await executeWithReliability(
      'B'.repeat(400),
      [{ role: 'user', content: 'C'.repeat(400) }],
      {
        provider: 'hosted_proxy',
        validationSchema: schema,
        fallbackPlaceholder: { answer: 'fallback' },
        retries: 1,
        context: { feature: 'explanation' },
      },
    );

    expect(result.success).toBe(true);
    const inputTokens = Math.ceil((400 + 400) / 4);
    const outputTokens = Math.ceil(response.length / 4);
    expect(result.estimatedCostUsd).toBeCloseTo(
      inputTokens * 0.00000005 + outputTokens * 0.00000008, 10,
    );
    expect(result.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('reports zero cost on the offline rail: no token spend is invented', async () => {
    const result = await executeWithReliability<string>(
      'System',
      [{ role: 'user', content: 'Prompt' }],
      {
        provider: 'offline',
        validationSchema: z.string(),
        fallbackPlaceholder: 'offline answer',
        retries: 1,
        context: { feature: 'explanation' },
      },
    );

    expect(result.success).toBe(false);
    expect(result.provider).toBe('offline');
    expect(result.estimatedCostUsd).toBe(0);
  });
});
