import { describe, expect, it } from 'vitest';
import { useProgressStore } from '../../store/progressStore';
import { testLog } from '../utils/flowLogger';
import { mockSupabase } from '../utils/mockSupabase';

describe('quiz flow', () => {
  it('starts and completes a quiz, then persists a valid quiz_sessions row', async () => {
    useProgressStore.setState({ userId: mockSupabase.user.id, quizScores: [], xpTotal: 0 });

    testLog('[TEST_FLOW]', 'quiz:complete-valid-db-backed-topic');
    await useProgressStore
      .getState()
      .addQuizScore(8, 10, 'Linear Equations', 'hs-math', '22222222-2222-4222-8222-222222222222');

    expect(mockSupabase.db.quiz_sessions).toContainEqual(
      expect.objectContaining({
        user_id: mockSupabase.user.id,
        subject_id: 'hs-math',
        topic_id: '22222222-2222-4222-8222-222222222222',
        score: 8,
        total: 10,
      }),
    );
  });

  it('exposes self-directed quiz persistence failure when topic_id is not supplied', async () => {
    useProgressStore.setState({ userId: mockSupabase.user.id, quizScores: [], xpTotal: 0 });

    testLog('[TEST_FLOW]', 'quiz:self-directed-without-topic-id', {
      subjectId: 'self_directed',
      topicName: 'General Interest',
    });

    await expect(
      useProgressStore.getState().addQuizScore(4, 5, 'General Interest', 'self_directed'),
    ).rejects.toThrow('was not found in the "self_directed" curriculum');

    expect(mockSupabase.db.quiz_sessions).toHaveLength(0);
    expect(useProgressStore.getState().xpTotal).toBe(0);
    expect(useProgressStore.getState().quizScores).toHaveLength(0);
  });
});
