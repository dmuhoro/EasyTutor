import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();

vi.mock('../../src/infrastructure/database', () => ({
  Database: {
    getClient: () => ({
      from: fromMock,
    }),
  },
}));

import {
  buildMissedQuestionsForReview,
  buildRemediationFromAnswers,
  buildSpacedReviewQuestions,
  computeWeakestSection,
  fetchLiteracyContent,
  fetchLiteracyProgress,
  getLiteracyResumeState,
  getLiteracyStreak,
  getPortalBridgeRecommendation,
  getSpacedReviewCandidates,
  hasUnit3Mastery,
  isSpacedReviewDue,
  isUnitUnlocked,
  LITERACY_MASTERY_THRESHOLD,
  recordLiteracyQuizAttempt,
  saveLiteracyProgress,
  saveLiteracyResumeState,
  SPACED_REVIEW_HOURS,
  touchLiteracyStreak,
} from '../../lib/aiLiteracy';

const sampleUnit = {
  unit_number: 1,
  title: 'Unit 1',
  objective: 'Obj',
  sections: [
    { heading: 'Section A', content: 'A' },
    { heading: 'Section B', content: 'B' },
    { heading: 'Section C', content: 'C' },
  ],
  quiz: [
    { question: 'Q1', options: ['A', 'B'], correct: 0, explanation: 'A' },
    { question: 'Q2', options: ['A', 'B'], correct: 1, explanation: 'B' },
    { question: 'Q3', options: ['A', 'B'], correct: 0, explanation: 'A' },
  ],
};

describe('ai literacy offline behavior', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    fromMock.mockReset();
  });

  it('loads from cache when remote content fetch fails', async () => {
    const cached = [sampleUnit];
    await AsyncStorage.setItem('ai_literacy_content_cache_v1', JSON.stringify(cached));

    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: null, error: new Error('offline') }),
        }),
      }),
    });

    const units = await fetchLiteracyContent();
    expect(units).toHaveLength(1);
    expect(units[0].unit_number).toBe(1);
  });

  it('persists progress write payload with ai_literacy portal', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    fromMock.mockReturnValue({ upsert });

    await saveLiteracyProgress('u1', 2, 4, 5);

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ portal_type: 'ai_literacy' }),
      expect.objectContaining({ onConflict: 'user_id,unit_number' }),
    );
  });

  it('builds remediation for only missed questions', () => {
    const questions = [
      { question: 'What is AI?', options: ['Magic', 'Pattern software'], correct: 1, explanation: 'Pattern based.' },
      { question: 'What is hallucination?', options: ['Wrong confident output', 'Correct answer'], correct: 0, explanation: 'Confidently wrong output.' },
    ];
    const selected = [1, 1];
    const remediation = buildRemediationFromAnswers(questions, selected);
    expect(remediation).toHaveLength(1);
    expect(remediation[0].question).toContain('hallucination');
  });

  it('persists and restores resume state from local cache (offline-safe)', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    fromMock.mockReturnValue({ upsert });

    await saveLiteracyResumeState('user-1', 2, 3);
    const resume = await getLiteracyResumeState('user-1');

    expect(resume).toBeTruthy();
    expect(resume?.last_unit).toBe(2);
    expect(resume?.last_section).toBe(3);
  });

  it('sets mastered at 80%+ on first attempt', async () => {
    fromMock.mockReturnValue({ upsert: vi.fn(async () => ({ error: null })) });
    const result = await recordLiteracyQuizAttempt('u1', 1, 4, 5);
    expect(result.scorePct).toBe(LITERACY_MASTERY_THRESHOLD);
    expect(result.mastered).toBe(true);
    expect(result.newlyMastered).toBe(true);
    expect(result.bestScore).toBe(4);
  });

  it('tracks best score across multiple attempts', async () => {
    fromMock.mockReturnValue({ upsert: vi.fn(async () => ({ error: null })) });
    const first = await recordLiteracyQuizAttempt('u1', 1, 2, 5);
    expect(first.mastered).toBe(false);

    const second = await recordLiteracyQuizAttempt('u1', 1, 4, 5);
    expect(second.bestScore).toBe(4);
    expect(second.mastered).toBe(true);
    expect(second.newlyMastered).toBe(true);
    expect(second.attemptsCount).toBe(2);
  });

  it('locks unit 2 until unit 1 mastered', async () => {
    fromMock.mockReturnValue({ upsert: vi.fn(async () => ({ error: null })) });
    expect(isUnitUnlocked(2, [])).toBe(false);

    await recordLiteracyQuizAttempt('u1', 1, 4, 5);
    const progress = await fetchLiteracyProgress('u1');
    expect(isUnitUnlocked(2, progress)).toBe(true);
  });

  it('buildMissedQuestionsForReview returns only incorrect answers', () => {
    const questions = [
      { question: 'Q1', options: ['A', 'B'], correct: 0, explanation: 'A' },
      { question: 'Q2', options: ['A', 'B'], correct: 1, explanation: 'B' },
      { question: 'Q3', options: ['A', 'B'], correct: 0, explanation: 'A' },
    ];
    const missed = buildMissedQuestionsForReview(questions, [0, 0, 0]);
    expect(missed).toHaveLength(1);
    expect(missed[0].question).toBe('Q2');
  });

  it('persists streak locally offline', async () => {
    const streak = await touchLiteracyStreak('u-streak');
    expect(streak).toBeGreaterThanOrEqual(1);
    const loaded = await getLiteracyStreak('u-streak');
    expect(loaded).toBe(streak);
  });

  it('clears resume state when unit is mastered', async () => {
    fromMock.mockReturnValue({ upsert: vi.fn(async () => ({ error: null })) });
    await saveLiteracyResumeState('user-1', 1, 2);
    await recordLiteracyQuizAttempt('user-1', 1, 4, 5);
    const resume = await getLiteracyResumeState('user-1');
    expect(resume).toBeNull();
  });

  it('computes and persists weakest section after quiz', async () => {
    fromMock.mockReturnValue({ upsert: vi.fn(async () => ({ error: null })) });
    const weakest = computeWeakestSection(sampleUnit as any, sampleUnit.quiz, [0, 1, 1]);
    expect(weakest.heading).toBeTruthy();

    await recordLiteracyQuizAttempt('u1', 1, 1, 3, {
      unit: sampleUnit as any,
      questions: sampleUnit.quiz,
      selectedAnswers: [0, 1, 1],
    });
    const progress = await fetchLiteracyProgress('u1');
    expect(progress[0].weakest_section).toBe(weakest.heading);
    expect(progress[0].weakest_score).toBe(weakest.scorePct);
  });

  it('detects spaced review due after 48 hours', () => {
    const now = Date.parse('2026-05-30T12:00:00.000Z');
    const completedAt = new Date(now - (SPACED_REVIEW_HOURS + 1) * 60 * 60 * 1000).toISOString();
    expect(isSpacedReviewDue(completedAt, now)).toBe(true);
    expect(isSpacedReviewDue(new Date(now).toISOString(), now)).toBe(false);
  });

  it('builds 3-question spaced review from weakest section', () => {
    const progress = {
      unit_number: 1,
      completed: true,
      score: 4,
      total_questions: 5,
      mastered: true,
      weakest_section: 'Section B',
      weakest_score: 0,
    };
    const questions = buildSpacedReviewQuestions(sampleUnit as any, progress as any, 3);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(3);
  });

  it('returns spaced review candidates for mastered units past due', () => {
    const now = Date.parse('2026-05-30T12:00:00.000Z');
    const completedAt = new Date(now - (SPACED_REVIEW_HOURS + 2) * 60 * 60 * 1000).toISOString();
    const candidates = getSpacedReviewCandidates(
      [sampleUnit as any],
      [{
        unit_number: 1,
        completed: true,
        score: 4,
        total_questions: 5,
        mastered: true,
        completed_at: completedAt,
      }],
      now,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].unit.unit_number).toBe(1);
  });

  it('recommends portal bridge based on learning mode', () => {
    expect(getPortalBridgeRecommendation('university').route).toBe('/university');
    expect(getPortalBridgeRecommendation('self_directed').title).toContain('Self-Directed');
    expect(getPortalBridgeRecommendation(null).route).toBe('/high-school');
  });

  it('detects unit 3 mastery for portal bridge', () => {
    expect(hasUnit3Mastery([])).toBe(false);
    expect(hasUnit3Mastery([{ unit_number: 3, completed: true, score: 4, total_questions: 5, mastered: true }])).toBe(true);
  });
});
