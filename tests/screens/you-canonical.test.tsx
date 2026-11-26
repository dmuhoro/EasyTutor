import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

// Real YouTab → ProgressTab composition, with only the store/dashboard edges
// mocked. The canonical projection itself is not mocked: it must derive from
// the same store fixtures that drive the screen.
const fixtures = vi.hoisted(() => ({
  quizScores: [
    { date: '2026-01-01T09:00:00.000Z', score: 3, total: 4, topic: 'Hydraulic Pascal Ratio' },
  ] as { date: string; score: number; total: number; topic: string }[],
  wrongAnswers: [] as Record<string, unknown>[],
  topicsStudied: { 'auto-eng': ['Hydraulic Pascal Ratio'] } as Record<string, string[]>,
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'learner-1', email: 'wanjiru@example.test' } }),
}));

vi.mock('../../store/progressStore', () => ({
  useProgressStore: () => ({
    studyStreak: 2,
    xpTotal: 120,
    topicsStudied: fixtures.topicsStudied,
    wrongAnswers: fixtures.wrongAnswers,
    quizScores: fixtures.quizScores,
    getLevel: () => 'Beginner',
  }),
}));

vi.mock('../../store/roadmapStore', () => ({
  useRoadmapStore: () => ({
    roadmaps: [],
    getRoadmapProgress: () => 0,
    learningMode: 'high_school',
  }),
}));

vi.mock('../../lib/dashboard', () => ({
  getMasteryDistribution: vi.fn(async () => []),
  getXPTrend: vi.fn(async () => []),
  getStreak: vi.fn(async () => 0),
}));

import YouTab from '../../screens/tabs/you';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function flatten(value: unknown): string {
  if (value == null || typeof value === 'boolean') return '';
  if (Array.isArray(value)) return value.map(flatten).join('');
  if (typeof value === 'object') return '';
  return String(value);
}

describe('You — canonical learner state at the real tab boundary', () => {
  it('renders the canonical mastery confidence derived from quiz evidence', async () => {
    let tree: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(YouTab));
    });
    if (!tree) throw new Error('YouTab did not render');

    const text = tree.root
      .findAll((node) => node.type === Text)
      .map((node) => flatten(node.props.children))
      .join(' ');

    expect(text).toContain('Your Progress');
    expect(text).toContain('Mastery: 43%');
  });
});
