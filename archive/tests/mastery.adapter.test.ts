import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * E11 adapter wiring proof.
 *
 * The domain helper is deliberately controlled here so these tests fail if
 * `lib/mastery.ts` keeps using its own raw band/threshold logic. This exercises
 * the same `updateMastery` path called by `screens/shared/practice-session.tsx`.
 */
const h = vi.hoisted(() => ({
  canonicalConfidence: 0.8,
  band: 'developing' as 'weak' | 'developing' | 'strong',
  getItem: vi.fn(async (_key: string): Promise<string | null> => null),
  setItem: vi.fn(async (_key: string, _value: string): Promise<void> => undefined),
  getAllKeys: vi.fn(async (): Promise<string[]> => []),
  track: vi.fn(),
}));

vi.mock('../src/domain/learning/mastery', () => ({
  evaluateMasteryPercent: vi.fn(() => ({
    level: 'proficient' as const,
    confidence: h.canonicalConfidence,
    reason: 'adapter control',
  })),
  evaluateMasteryBand: vi.fn(() => h.band),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: h.getItem,
    setItem: h.setItem,
    getAllKeys: h.getAllKeys,
  },
}));

vi.mock('../lib/analytics', () => ({ track: h.track }));
vi.mock('../lib/supabase', () => ({ supabase: null }));

import { getMasteryBand, updateMastery } from '../lib/mastery';
import { evaluateMasteryBand, evaluateMasteryPercent } from '../src/domain/learning/mastery';

const record = (attempts: number, correct: number, total: number, mastery: number): string =>
  JSON.stringify({
    subject: 'Mathematics',
    topic: 'Algebra',
    attempts,
    correct_answers: correct,
    total_answers: total,
    mastery_percent: mastery,
  });

describe('E11 canonical adapter wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.canonicalConfidence = 0.8;
    h.band = 'developing';
    h.getItem.mockResolvedValue(record(1, 4, 5, 80));
  });

  it('delegates band classification to the canonical domain selector', () => {
    h.band = 'weak';

    expect(getMasteryBand(90)).toBe('weak');
    expect(evaluateMasteryBand).toHaveBeenCalledWith(90);
  });

  it('uses canonical confidence for weak-topic detection on the real write path', async () => {
    h.canonicalConfidence = 0.4;

    await updateMastery('user-77', 'Mathematics', 'Algebra', 4, 5);

    expect(evaluateMasteryPercent).toHaveBeenCalledWith(80);
    expect(h.track).toHaveBeenCalledWith('weak_topic_detected', expect.objectContaining({
      subject: 'Mathematics',
      topic: 'Algebra',
      mastery_percent: 80,
    }));
  });

  it('does not emit a weak-topic event when canonical confidence says capable', async () => {
    h.getItem.mockResolvedValue(record(1, 0, 5, 0));
    h.canonicalConfidence = 0.8;

    await updateMastery('user-77', 'Mathematics', 'Algebra', 4, 5);

    expect(evaluateMasteryPercent).toHaveBeenCalledWith(40);
    expect(h.track).not.toHaveBeenCalledWith('weak_topic_detected', expect.anything());
  });
});
