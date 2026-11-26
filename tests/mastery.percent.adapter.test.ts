import { describe, expect, it } from 'vitest';
import {
  evaluateMasteryBand,
  evaluateMasteryPercent,
} from '../src/domain/learning/mastery';

/**
 * E11 canonical domain adapter (Sprint 82).
 * These cases pin the existing numeric contract so the persistence adapter
 * cannot silently move a learner across a band.
 */
describe('canonical mastery percent adapter', () => {
  it('derives confidence through evaluateMastery without changing percent boundaries', () => {
    expect(evaluateMasteryPercent(0).confidence).toBeCloseTo(0.2, 10);
    expect(evaluateMasteryPercent(40).confidence).toBeCloseTo(0.4, 10);
    expect(evaluateMasteryPercent(49).confidence).toBeCloseTo(0.49, 10);
    expect(evaluateMasteryPercent(50).confidence).toBeCloseTo(0.5, 10);
    expect(evaluateMasteryPercent(70).confidence).toBeCloseTo(0.7, 10);
    expect(evaluateMasteryPercent(100).confidence).toBeCloseTo(0.8, 10);
  });

  it('preserves the existing 40/70 band boundaries exactly', () => {
    expect(evaluateMasteryBand(39)).toBe('weak');
    expect(evaluateMasteryBand(40)).toBe('developing');
    expect(evaluateMasteryBand(69)).toBe('developing');
    expect(evaluateMasteryBand(70)).toBe('strong');
    expect(evaluateMasteryBand(100)).toBe('strong');
  });

  it('preserves the fail-closed result for non-finite input', () => {
    expect(evaluateMasteryBand(Number.NaN)).toBe('strong');
  });
});
