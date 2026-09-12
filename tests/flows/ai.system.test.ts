import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateExplanation, logAIEvent } from '../../lib/ai';
import { getDifficultyLevel } from '../../lib/difficulty';
import { getWeakTopicWithExplanation } from '../../lib/adaptive';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';

// Mock AI API
vi.mock('../../lib/api', () => ({
  askTutor: vi.fn(async () => ({ success: true, data: 'Mock explanation' })),
  callAnthropic: vi.fn(async () => 'Mock explanation'),
  callGroq: vi.fn(async () => 'Mock explanation'),
  callOllama: vi.fn(async () => 'Mock explanation')
}));

// Mock provider
vi.mock('../../lib/aiProvider', () => ({
  AI_PROVIDER: { ONLINE: 'online', OFFLINE: 'offline' },
  getAIProvider: vi.fn(() => 'online'),
  shouldUseCloud: vi.fn(() => false),
}));

// Mock supabase client
vi.mock('../../lib/supabaseOps', async () => {
  const actual = await vi.importActual('../../lib/supabaseOps');
  return {
    ...actual as any,
    getSupabaseClient: () => mockSupabase.client,
  };
});

describe('AI System', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  it('generates explanation safely via service layer', async () => {
    const explanation = await generateExplanation({
      topicTitle: 'Calculus',
      masteryLevel: 20,
      subjectId: 'uni-engineering'
    });

    expect(explanation).toBe('Mock explanation');
  });

  it('adjusts difficulty correctly based on mastery', () => {
    expect(getDifficultyLevel(10)).toBe('easy');
    expect(getDifficultyLevel(50)).toBe('medium');
    expect(getDifficultyLevel(90)).toBe('hard');
  });

  it('bridges adaptive detection with AI explanation', async () => {
    mockSupabase.db.user_progress.push({
      user_id: TEST_USER_ID,
      topic_id: '22222222-2222-4222-8222-222222222222',
      subject_id: 'hs-math',
      mastery_level: 20,
      attempts: 1
    });

    const focus = await getWeakTopicWithExplanation(TEST_USER_ID);
    expect(focus).toBeTruthy();
    expect(focus?.explanation).toBe('Mock explanation');
  });

  it('logs AI events to the user_events table', async () => {
    await logAIEvent({
      userId: TEST_USER_ID,
      type: 'ai_test_event',
      payload: { test: true }
    });

    const event = mockSupabase.db.user_events.find(e => e.event_type === 'ai_test_event');
    expect(event).toBeTruthy();
    expect(event?.payload.test).toBe(true);
  });
});
