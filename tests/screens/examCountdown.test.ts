import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

/**
 * C28 / GT-04 / E9 — the exam date captured by onboarding must be read from the
 * governed profile boundary and rendered as an honest countdown on Home. These
 * tests mount the real Home screen; no copy of the countdown UI is tested.
 */

const h = vi.hoisted(() => ({
  examDate: null as string | null,
  queryError: null as { message: string } | null,
  governedQuery: vi.fn(),
  maybeSingle: vi.fn(),
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
  Database: { governedQuery: h.governedQuery },
}));

vi.mock('../../lib/logEvent', () => ({ logError: h.logError }));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'learner-7', email: 'wanjiru@example.test' } }),
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
  });
  if (!tree) throw new Error('Home did not render');
  return tree;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
  vi.clearAllMocks();
  h.examDate = null;
  h.queryError = null;
  h.governedQuery.mockImplementation(() => ({ maybeSingle: h.maybeSingle }));
  h.maybeSingle.mockImplementation(async () => ({
    data: h.examDate ? { exam_date: h.examDate } : null,
    error: h.queryError,
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Exam countdown on the real Home screen (C28 / GT-04 / E9)', () => {
  it('reads exam_date through the governed profile boundary with the real portal and owner', async () => {
    h.examDate = '2026-06-11';
    const tree = await mount();

    expect(h.governedQuery).toHaveBeenCalledTimes(1);
    expect(h.governedQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'profiles',
        columns: 'exam_date',
        portalType: 'high_school',
        userId: 'learner-7',
      }),
    );
    expect(allText(tree)).toContain('Exam in 10 days');
  });

  it('renders a real future date, never invented sample copy', async () => {
    h.examDate = '2026-06-11';
    const text = allText(await mount());
    expect(text).toContain('Exam in 10 days');
    expect(text).not.toContain('CAT in');
  });

  it('hides the countdown when no exam date exists instead of showing a false zero', async () => {
    const text = allText(await mount());
    expect(text).not.toContain('Exam in');
    expect(text).not.toContain('Exam date has passed');
  });

  it('reports a past date honestly instead of a negative countdown', async () => {
    h.examDate = '2026-05-20';
    const text = allText(await mount());
    expect(text).toContain('Exam date has passed');
    expect(text).not.toMatch(/Exam in -\d+ days/);
  });

  it('logs a governed read failure and shows no countdown', async () => {
    h.queryError = { message: 'profile read denied' };
    const text = allText(await mount());
    expect(h.logError).toHaveBeenCalledWith('HOME_exam_date_fetch_failed', expect.anything());
    expect(text).not.toContain('Exam in');
    expect(text).not.toContain('Exam date has passed');
  });
});
