import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

/**
 * C21 — real recommendation output must be surfaced on the reachable Home
 * screen. `getRecommendedTopics` is the real selector; only its injected
 * result is controlled here. Empty and failed reads must never invent topics.
 */

const h = vi.hoisted(() => ({
  topics: [] as string[],
  fetchError: null as Error | null,
  fetchAll: vi.fn(),
  getRetentionStore: vi.fn(),
  getRecommendedTopics: vi.fn(),
  logError: vi.fn(),
  updateStreak: vi.fn(async () => {}),
  syncPendingProgress: vi.fn(async () => {}),
  syncQueuedTasks: vi.fn(async () => {}),
  fetchSavedRoadmaps: vi.fn(async () => {}),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
}));

vi.mock('../../lib/idleTask', () => ({
  scheduleIdleTask: (task: () => void) => {
    task();
    return () => {};
  },
}));

vi.mock('../../src/infrastructure/database', () => ({
  Database: { governedQuery: () => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) }) },
}));

vi.mock('../../lib/logEvent', () => ({ logError: h.logError }));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'learner-9', email: 'learner-9@example.test' } }),
}));

vi.mock('../../store/progressStore', () => ({
  useProgressStore: () => ({
    xpEvents: [],
    quizScores: [],
    wrongAnswers: [],
    pendingProgressSync: false,
    updateStreak: h.updateStreak,
    syncPendingProgress: h.syncPendingProgress,
  }),
}));

vi.mock('../../store/roadmapStore', () => ({
  useRoadmapStore: () => ({
    roadmaps: [{
      id: 'roadmap-1',
      topic: 'Algebra',
      title: 'Mathematics plan',
      days: [{ day: 1, title: 'Day 1', tasks: ['Read chapter 1'] }],
      learningMode: 'high_school',
      subjectId: 'mathematics',
      createdAt: '2026-05-01T00:00:00.000Z',
      lastOpenedAt: '2026-05-01T00:00:00.000Z',
    }],
    checkedTasks: {},
    learningMode: 'high_school',
    getRoadmapProgress: () => 0,
    syncQueuedTasks: h.syncQueuedTasks,
    fetchSavedRoadmaps: h.fetchSavedRoadmaps,
  }),
}));

vi.mock('../../lib/cache', () => ({ preloadQuizCache: vi.fn(async () => {}) }));
vi.mock('../../components/ui/ProgressRing', () => ({
  ProgressRing: () => React.createElement('ProgressRing'),
}));

vi.mock('../../lib/spacedRepetitionEngine', async () => {
  const actual = await vi.importActual<typeof import('../../lib/spacedRepetitionEngine')>(
    '../../lib/spacedRepetitionEngine',
  );
  return { ...actual, getRetentionStore: h.getRetentionStore };
});

vi.mock('../../lib/recommendations', () => ({
  getRecommendedTopics: h.getRecommendedTopics,
}));

import HomeTab from '../../screens/tabs/index';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function allText(tree: TestRenderer.ReactTestRenderer): string {
  return tree.root
    .findAll((node) => node.type === Text)
    .map((node) => {
      const value: unknown = node.props.children;
      if (value == null || typeof value === 'boolean') return '';
      if (Array.isArray(value)) return value.map((child) => String(child)).join('');
      return String(value);
    })
    .join(' ');
}

async function mount(): Promise<TestRenderer.ReactTestRenderer> {
  let tree: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = TestRenderer.create(React.createElement(HomeTab));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  if (!tree) throw new Error('Home did not render');
  return tree;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
  vi.clearAllMocks();
  h.topics = [];
  h.fetchError = null;
  h.fetchAll.mockImplementation(async () => []);
  h.getRetentionStore.mockImplementation(() => ({ fetchAll: h.fetchAll, save: vi.fn() }));
  h.getRecommendedTopics.mockImplementation(async () => {
    if (h.fetchError) throw h.fetchError;
    return h.topics;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Recommendations surfaced on the real Home screen (C21)', () => {
  it('uses the real selector for the signed-in learner and shows only returned topics', async () => {
    h.topics = ['algebra', 'fractions'];
    const text = allText(await mount());

    expect(h.getRecommendedTopics).toHaveBeenCalledWith('learner-9', 'mathematics');
    expect(text).toContain('Topics');
    expect(text).toContain('2 flagged');
    expect(text).toContain('algebra');
    expect(text).toContain('fractions');
  });

  it('shows no false section when the selector returns nothing', async () => {
    const text = allText(await mount());

    expect(text).not.toContain('2 flagged');
    expect(text).not.toContain('Topics');
  });

  it('logs a failed selector read and never invents a recommendation', async () => {
    h.fetchError = new Error('recommendation read denied');
    const text = allText(await mount());

    expect(h.logError).toHaveBeenCalledWith('HOME_recommendations_failed', expect.anything());
    expect(text).not.toContain('Topics');
  });
});
