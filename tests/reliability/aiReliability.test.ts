import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeWithReliability, AIProvider } from '../../lib/ai/reliability';
import { callAnthropic, callGroq, callOllama } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

// Mock low-level API functions
vi.mock('../../lib/api', () => ({
  callAnthropic: vi.fn(),
  callGroq: vi.fn(),
  callOllama: vi.fn()
}));

// Mock settings store
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      ollamaUrl: 'http://localhost:11434',
      ollamaChatModel: 'deepseek-r1:14b'
    })
  }
}));

describe('AI Reliability & Dependability Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('successfully executes primary provider hosted_claude', async () => {
    vi.mocked(callAnthropic).mockResolvedValueOnce(
      JSON.stringify({ explanation: 'Calculus details', confidence: 95 })
    );

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt text' }],
      {
        providers: ['hosted_claude'],
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 1,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('hosted_claude');
    expect(result.data.explanation).toBe('Calculus details');
    expect(result.attemptsUsed).toBe(1);
    expect(result.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('performs exponential backoff retries on failure', async () => {
    // Fail first attempt, succeed second attempt
    vi.mocked(callAnthropic)
      .mockRejectedValueOnce(new Error('Rate Limit Exceeded'))
      .mockResolvedValueOnce(JSON.stringify({ explanation: 'Physics notes', confidence: 90 }));

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        providers: ['hosted_claude'],
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 2,
        baseDelayMs: 10, // low delay to speed up tests
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('hosted_claude');
    expect(result.data.explanation).toBe('Physics notes');
    expect(result.attemptsUsed).toBe(2);
  });

  it('falls back to local_ollama if cloud hosted_claude fails completely', async () => {
    vi.mocked(callAnthropic).mockRejectedValue(new Error('Claude cloud offline'));
    vi.mocked(callOllama).mockResolvedValueOnce(
      JSON.stringify({ explanation: 'Offline Ollama response', confidence: 80 })
    );

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        providers: ['hosted_claude', 'local_ollama'],
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 1,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('local_ollama');
    expect(result.data.explanation).toBe('Offline Ollama response');
  });

  it('triggers timeout and falls back to subsequent provider', async () => {
    // Mock callAnthropic to take infinite time
    vi.mocked(callAnthropic).mockImplementationOnce(() => new Promise(() => {}));
    vi.mocked(callOllama).mockResolvedValueOnce(
      JSON.stringify({ explanation: 'Ollama fallback explanation', confidence: 75 })
    );

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        providers: ['hosted_claude', 'local_ollama'],
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        timeoutMs: 20, // ultra short timeout
        retries: 1,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('local_ollama');
    expect(result.data.explanation).toBe('Ollama fallback explanation');
  });

  it('handles invalid Zod json responses by retrying or falling back', async () => {
    // Returns corrupt/invalid schema first, then valid response
    vi.mocked(callAnthropic)
      .mockResolvedValueOnce(JSON.stringify({ explanation: 'Corrupt fields without confidence' }))
      .mockResolvedValueOnce(JSON.stringify({ explanation: 'Valid after retry', confidence: 99 }));

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        providers: ['hosted_claude'],
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 2,
        baseDelayMs: 10,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('hosted_claude');
    expect(result.data.explanation).toBe('Valid after retry');
    expect(result.attemptsUsed).toBe(2);
  });

  it('restores successfully from local AsyncStorage cache on failure', async () => {
    vi.mocked(callAnthropic).mockRejectedValue(new Error('Cloud offline'));
    
    const cacheKey = 'test_explanation_cache';
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ explanation: 'Cached answer', confidence: 85 }));

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        providers: ['hosted_claude', 'cache'],
        validationSchema: testSchema,
        cacheKey,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 1,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('cache');
    expect(result.data.explanation).toBe('Cached answer');
  });

  it('returns placeholder if absolutely all providers in chain fail', async () => {
    vi.mocked(callAnthropic).mockRejectedValue(new Error('Claude offline'));
    vi.mocked(callOllama).mockRejectedValue(new Error('Ollama offline'));

    const result = await executeWithReliability(
      'System prompt',
      [{ role: 'user', content: 'Prompt' }],
      {
        providers: ['hosted_claude', 'local_ollama', 'placeholder'],
        validationSchema: testSchema,
        fallbackPlaceholder: baselinePlaceholder,
        retries: 1,
        context: { feature: 'explanation' }
      }
    );

    expect(result.success).toBe(false);
    expect(result.provider).toBe('placeholder');
    expect(result.data.explanation).toBe('Syllabus baseline practice');
  });
});
