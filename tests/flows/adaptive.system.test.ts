import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getWeakTopics, recommendNextTopic } from '../../lib/adaptive';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';

// Mock the supabase client globally
vi.mock('../../lib/supabaseOps', async () => {
  const actual = await vi.importActual('../../lib/supabaseOps');
  return {
    ...actual as any,
    getSupabaseClient: () => mockSupabase.client,
  };
});

describe('Adaptive System', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('detects weak topics correctly', async () => {
    // Setup: one weak topic (30% mastery), one strong (80% mastery)
    mockSupabase.db.user_progress.push(
      {
        user_id: TEST_USER_ID,
        topic_id: '22222222-2222-4222-8222-222222222222', // Linear Equations
        subject_id: 'hs-math',
        mastery_level: 30,
        attempts: 2
      },
      {
        user_id: TEST_USER_ID,
        topic_id: '33333333-3333-4333-8333-333333333333', // Calculus I
        subject_id: 'uni-engineering',
        mastery_level: 80,
        attempts: 5
      }
    );

    const weak = await getWeakTopics(TEST_USER_ID);
    expect(weak.length).toBe(1);
    expect(weak[0].topic_id).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('returns lowest mastery topic as recommendation', async () => {
    // Setup: two topics in same subject, different mastery
    mockSupabase.db.user_progress.push(
      {
        user_id: TEST_USER_ID,
        topic_id: '22222222-2222-4222-8222-222222222222',
        subject_id: 'hs-math',
        mastery_level: 45,
        attempts: 3
      },
      {
        user_id: TEST_USER_ID,
        topic_id: '55555555-5555-5555-8555-555555555555', // Mocking another math topic
        subject_id: 'hs-math',
        mastery_level: 25,
        attempts: 1
      }
    );
    
    // Seed the other math topic so FK validation passes
    mockSupabase.db.topics.push({
      id: '55555555-5555-5555-8555-555555555555',
      subject_id: 'hs-math',
      title: 'Quadratic Equations',
      sort_order: 2
    });

    const recommendation = await recommendNextTopic(TEST_USER_ID, 'hs-math');
    expect(recommendation).toBeTruthy();
    expect(recommendation?.topic_id).toBe('55555555-5555-5555-8555-555555555555');
  });

  it('handles empty progress safely', async () => {
    const weak = await getWeakTopics(TEST_USER_ID);
    const recommendation = await recommendNextTopic(TEST_USER_ID, 'hs-math');

    expect(weak).toEqual([]);
    expect(recommendation).toBeNull();
  });

  it('orders topics by mastery then attempts', async () => {
    // Setup: same mastery, different attempts
    mockSupabase.db.user_progress.push(
      {
        user_id: TEST_USER_ID,
        topic_id: '22222222-2222-4222-8222-222222222222',
        subject_id: 'hs-math',
        mastery_level: 50,
        attempts: 10
      },
      {
        user_id: TEST_USER_ID,
        topic_id: '55555555-5555-5555-8555-555555555555',
        subject_id: 'hs-math',
        mastery_level: 50,
        attempts: 2
      }
    );

    mockSupabase.db.topics.push({
      id: '55555555-5555-5555-8555-555555555555',
      subject_id: 'hs-math',
      title: 'Quadratic Equations',
      sort_order: 2
    });

    const recommendation = await recommendNextTopic(TEST_USER_ID, 'hs-math');
    expect(recommendation?.attempts).toBe(2);
  });
});
