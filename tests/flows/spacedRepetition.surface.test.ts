import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

/**
 * C20 / GT-14 — due reviews must be surfaced on the reachable Home screen.
 * `getDueReviews` is the real selector; only its injected retention store is controlled.
 */

const h = vi.hoisted(() => ({
  profiles: [] as Array<{
    id: string;
    level: 'topic';
    lastReviewedAt: string;
    reviewCount: number;
    retentionScore: number;
    forgettingRisk: number;
    nextReviewDate: string;
    reviewStage: number;
  }>,
  fetchError: null as Error | null,
  fetchAll: vi.fn(),
  getRetentionStore: vi.fn(),
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
  useAuthStore: () => ({ user: { id: 'learner-9', email: ' learner-9@example.test ' } }),
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
    roadmaps: [],
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
  return {
    ...actual,
    getRetentionStore: h.getRetentionStore,
  };
});

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
  });
  if (!tree) throw new Error('Home did not render');
  return tree;
}

function profile(id: string, nextReviewDate: string) {
  return {
    id,
    level: 'topic' as const,
    lastReviewedAt: '2026-05-01T00:00:00.000Z',
    reviewCount: 2,
    retentionScore: 40,
    forgettingRisk: 70,
    nextReviewDate,
    reviewStage: 2,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
  vi.clearAllMocks();
  h.profiles = [];
  h.fetchError = null;
  h.fetchAll.mockImplementation(async () => {
    if (h.fetchError) throw h.fetchError;
    return h.profiles;
  });
  h.getRetentionStore.mockImplementation(() => ({ fetchAll: h.fetchAll, save: vi.fn() }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Spaced repetition surfaced on the real Home screen (C20 / GT-14)', () => {
  it('uses the real due selector for the signed-in learner and shows only due items', async () => {
    h.profiles = [
      profile('algebra-review', '2026-06-01T00:00:00.000Z'),
      profile('future-review', '2026-07-01T00:00:00.000Z'),
    ];
    const text = allText(await mount());

    expect(h.getRetentionStore).toHaveBeenCalledWith('learner-9');
    expect(text).toContain('Review');
    expect(text).toContain('1 flagged');
    expect(text).toContain('algebra-review');
    expect(text).not.toContain('future-review');
  });

  it('shows no false section when nothing is due', async () => {
    h.profiles = [profile('future-review', '2026-07-01T00:00:00.000Z')];
    const text = allText(await mount());

    expect(text).not.toContain('1 flagged');
    expect(text).not.toContain('future-review');
  });

  it('logs a failed store read and never invents a due review', async () => {
    h.fetchError = new Error('retention read denied');
    const text = allText(await mount());

    expect(h.logError).toHaveBeenCalledWith('HOME_due_reviews_failed', expect.anything());
    expect(text).not.toContain('1 flagged');
  });
});
