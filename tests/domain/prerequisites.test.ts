import { describe, expect, it } from 'vitest';

import {
  allPrerequisites,
  findGaps,
  hasCycle,
  paths,
  prerequisitesOf,
  type Edge,
} from '../../src/domain/learning/prerequisites';

/**
 * C19 — Prerequisites engine. Pure, deterministic coverage of the real domain
 * functions. No mocks: these functions have no I/O, so a mocked test would be
 * a false gate.
 */
const edges: Edge[] = [
  { from: 'algebra', to: 'calculus' },
  { from: 'arithmetic', to: 'algebra' },
  { from: 'functions', to: 'calculus' },
];

describe('prerequisites engine (C19)', () => {
  it('detects a real cycle and rejects a DAG', () => {
    expect(hasCycle(['algebra', 'calculus'], edges)).toBe(false);
    expect(hasCycle(['a', 'b'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }])).toBe(true);
  });

  it('returns only direct prerequisites', () => {
    expect(prerequisitesOf('calculus', edges)).toEqual(['algebra', 'functions']);
    expect(prerequisitesOf('arithmetic', edges)).toEqual([]);
  });

  it('walks the full transitive closure exactly once', () => {
    expect([...allPrerequisites('calculus', edges)].sort()).toEqual(
      ['algebra', 'arithmetic', 'functions'],
    );
  });

  it('reports the true gap set, excluding skills already known', () => {
    expect(findGaps('calculus', new Set(['algebra']), edges).sort()).toEqual(
      ['arithmetic', 'functions'],
    );
    expect(findGaps('calculus', new Set(['algebra', 'arithmetic', 'functions']), edges)).toEqual([]);
  });

  it('enumerates every closure chain from a leaf to the target', () => {
    expect(paths('algebra', edges)).toEqual([['arithmetic', 'algebra']]);
    expect(paths('calculus', edges).map((p) => p.join('>')).sort()).toEqual([
      'arithmetic>algebra>calculus',
      'functions>calculus',
    ]);
  });
});
