import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeWithReliability, withRetry, withTimeout } from '../../lib/ai/reliability';
import { callAIProxy, callOllama } from '../../lib/ai/providers';
import { resetAICircuitBreakers } from '../../lib/ai/circuitBreaker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

// Mock Platform as native so local_ollama can be tested.
// On web, canUseLocalModelServer() blocks loopback URLs per SPEC T2.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock only the two network leaves. The real ProviderHttpError class is kept so
// retry classification is exercised, not replaced.
vi.mock('../../lib/ai/providers', async () => {
  const actual = await vi.importActual<typeof import('../../lib/ai/providers')>(
    '../../lib/ai/providers',
  );
  return {
    ...actual,
    callAIProxy: vi.fn(),
    callOllama: vi.fn(),
  };
});

// Mock settings store
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      aiMode: 'local',
      ollamaUrl: 'http://localhost:11434',
      ollamaChatModel: 'qwen2.5:1.5b'
    })
  }
}));

describe('AI Reliability & Dependability Wrapper', () => {
  beforeEach(() => {
    // reset, not clear: a once-only mock left unconsumed by an earlier test
    // must never leak into the next one.
    vi.resetAllMocks();
    resetAICircuitBreakers();
    AsyncStorage.clear();
  });

  const testSchema = z.object({
    explanation: z.string(),
    confidence: z.number()
  });

  const baselinePlaceholder = {
    explanation: 'Syllabus baseline practice',
    confidence: 100
  };

  // Migrated from the false `hosted_claude` alias: the same server proxy is now
  // named truthfully, and the reported provider must equal the rail invoked.
  it('successfully executes the selected hosted proxy', async () => {
    vi.mocked(callAIProxy).mockResolvedValueOnce(
      JSON.stringify({ explanation: 'Calculus details', confidence: 95 })
    );

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt text' }],
      {
        provider: 'hosted_proxy',
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 1,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('hosted_proxy');
    expect(result.selectedProvider).toBe('hosted_proxy');
    expect(callAIProxy).toHaveBeenCalledTimes(1);
    expect(callOllama).not.toHaveBeenCalled();
    expect(result.data.explanation).toBe('Calculus details');
    expect(result.attemptsUsed).toBe(1);
    expect(result.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('performs exponential backoff retries on failure', async () => {
    // Fail first attempt, succeed second attempt
    vi.mocked(callAIProxy)
      .mockRejectedValueOnce(new Error('Rate Limit Exceeded'))
      .mockResolvedValueOnce(JSON.stringify({ explanation: 'Physics notes', confidence: 90 }));

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        provider: 'hosted_proxy',
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 2,
        baseDelayMs: 10, // low delay to speed up tests
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('hosted_proxy');
    expect(callAIProxy).toHaveBeenCalledTimes(2);
    expect(callOllama).not.toHaveBeenCalled();
    expect(result.data.explanation).toBe('Physics notes');
    expect(result.attemptsUsed).toBe(2);
  });

  // The old test claimed a failed hosted rail silently switched to local. M1
  // forbids that: the local rail is used only when the selector chose it.
  it('uses the selected local rail without contacting the hosted proxy', async () => {
    vi.mocked(callOllama).mockResolvedValueOnce(
      JSON.stringify({ explanation: 'Offline Ollama response', confidence: 80 })
    );

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        provider: 'local_ollama',
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 1,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('local_ollama');
    expect(result.selectedProvider).toBe('local_ollama');
    expect(callOllama).toHaveBeenCalledTimes(1);
    expect(callAIProxy).not.toHaveBeenCalled();
    expect(result.data.explanation).toBe('Offline Ollama response');
  });

  it('times out the selected local rail without switching to hosted', async () => {
    vi.mocked(callOllama).mockImplementationOnce(() => new Promise(() => {}));
    vi.mocked(callAIProxy).mockResolvedValueOnce(
      JSON.stringify({ explanation: 'Should never be called', confidence: 99 })
    );

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        provider: 'local_ollama',
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        timeoutMs: 20, // ultra short timeout
        retries: 1,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(false);
    expect(result.provider).toBe('placeholder');
    expect(result.selectedProvider).toBe('local_ollama');
    expect(callAIProxy).not.toHaveBeenCalled();
    expect(result.data.explanation).toBe('Syllabus baseline practice');
  });

  it('handles invalid Zod json responses by retrying', async () => {
    // Returns corrupt/invalid schema first, then valid response
    vi.mocked(callAIProxy)
      .mockResolvedValueOnce(JSON.stringify({ explanation: 'Corrupt fields without confidence' }))
      .mockResolvedValueOnce(JSON.stringify({ explanation: 'Valid after retry', confidence: 99 }));

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        provider: 'hosted_proxy',
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 2,
        baseDelayMs: 10,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('hosted_proxy');
    expect(result.data.explanation).toBe('Valid after retry');
    expect(result.attemptsUsed).toBe(2);
  });

  it('restores successfully from local AsyncStorage cache on failure', async () => {
    vi.mocked(callAIProxy).mockRejectedValue(new Error('Cloud offline'));

    const cacheKey = 'test_explanation_cache';
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ explanation: 'Cached answer', confidence: 85 }));

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        provider: 'hosted_proxy',
        validationSchema: testSchema,
        cacheKey,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 1,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('cache');
    expect(result.selectedProvider).toBe('hosted_proxy');
    expect(callOllama).not.toHaveBeenCalled();
    expect(result.data.explanation).toBe('Cached answer');
  });

  // Strengthened from "all providers fail" to prove there is no second rail.
  it('returns placeholder when the selected hosted rail fails, never switching rails', async () => {
    vi.mocked(callAIProxy).mockRejectedValue(new Error('Proxy offline'));
    vi.mocked(callOllama).mockResolvedValueOnce(
      JSON.stringify({ explanation: 'Must not be used', confidence: 100 })
    );

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        provider: 'hosted_proxy',
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 1,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(false);
    expect(result.provider).toBe('placeholder');
    expect(result.selectedProvider).toBe('hosted_proxy');
    expect(callOllama).not.toHaveBeenCalled();
    expect(result.data.explanation).toBe('Syllabus baseline practice');
  });

  it('returns offline immediately when the selector chose offline', async () => {
    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        provider: 'offline',
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 1,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(false);
    expect(result.provider).toBe('offline');
    expect(result.selectedProvider).toBe('offline');
    expect(result.attemptsUsed).toBe(0);
    expect(callAIProxy).not.toHaveBeenCalled();
    expect(callOllama).not.toHaveBeenCalled();
    expect(result.data.explanation).toBe('Syllabus baseline practice');
  });
});

describe('withTimeout — quiz hang protection (T5)', () => {
  it('rejects when the promise takes longer than the timeout', async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('done'), 5000);
    });

    await expect(withTimeout(slowPromise, 100, 'AI timed out')).rejects.toThrow('AI timed out');
  });

  it('resolves when the promise completes before the timeout', async () => {
    const fastPromise = Promise.resolve('done');
    const result = await withTimeout(fastPromise, 1000, 'AI timed out');
    expect(result).toBe('done');
  });
});

describe('withRetry — quiz retry on failure (T5)', () => {
  it('retries on failure and succeeds on the second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('first attempt failed'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error when all retries are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 10 }))
      .rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('does not retry when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fatal error'));

    await expect(withRetry(fn, {
      maxRetries: 2,
      baseDelayMs: 10,
      shouldRetry: () => false,
    })).rejects.toThrow('fatal error');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
