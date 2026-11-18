import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, View } from 'react-native';

// ── Store fixtures ───────────────────────────────────────────────────────────
// The screen reads plain values from two Zustand stores. Fixtures are mutable
// so each scenario renders the same real component against different learner
// data — no copy of the screen is tested.

const fixtures = vi.hoisted(() => ({
  progress: 50,
  roadmaps: [] as Record<string, unknown>[],
  checkedTasks: {} as Record<string, Record<number, string[]>>,
  wrongAnswers: [] as Record<string, unknown>[],
  xpEvents: [] as Record<string, unknown>[],
  quizScores: [] as Record<string, unknown>[],
  pendingProgressSync: false,
}));

const push = vi.hoisted(() => vi.fn());

vi.mock('expo-router', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ user: { email: 'wanjiru@example.test' } }),
}));

vi.mock('../../store/progressStore', () => ({
  useProgressStore: () => ({
    xpEvents: fixtures.xpEvents,
    quizScores: fixtures.quizScores,
    wrongAnswers: fixtures.wrongAnswers,
    pendingProgressSync: fixtures.pendingProgressSync,
    updateStreak: async () => {},
    syncPendingProgress: async () => {},
  }),
}));

vi.mock('../../store/roadmapStore', () => ({
  useRoadmapStore: () => ({
    roadmaps: fixtures.roadmaps,
    checkedTasks: fixtures.checkedTasks,
    learningMode: 'high_school',
    getRoadmapProgress: () => fixtures.progress,
    syncQueuedTasks: async () => {},
    fetchSavedRoadmaps: async () => {},
  }),
}));

vi.mock('../../lib/cache', () => ({ preloadQuizCache: vi.fn(async () => {}) }));
vi.mock('../../lib/logEvent', () => ({ logError: vi.fn() }));
vi.mock('../../components/ui/ProgressRing', () => ({
  ProgressRing: () => React.createElement('ProgressRing'),
}));

import HomeTab from '../../screens/tabs/index';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Renderer = TestRenderer.ReactTestRenderer;

function flatten(value: unknown): string {
  if (value == null || typeof value === 'boolean') return '';
  if (Array.isArray(value)) return value.map(flatten).join('');
  if (typeof value === 'object') return '';
  return String(value);
}

function allText(tree: Renderer): string {
  return tree.root
    .findAll((node) => node.type === Text)
    .map((node) => flatten(node.props.children))
    .join(' ');
}

function textUnder(node: TestRenderer.ReactTestInstance): string {
  return node
    .findAll((child) => child.type === Text)
    .map((child) => flatten(child.props.children))
    .join(' ');
}

async function mount(): Promise<Renderer> {
  let tree: Renderer | undefined;
  await act(async () => {
    tree = TestRenderer.create(React.createElement(HomeTab));
  });
  if (!tree) throw new Error('Home did not render');
  return tree;
}

const ROADMAP = {
  id: 'roadmap-1',
  topic: 'Automotive Science',
  title: '7-Day Study Roadmap for Automotive Science',
  subjectId: 'auto-eng',
  createdAt: '2026-11-16T08:00:00.000Z',
  lastOpenedAt: '2026-11-17T08:00:00.000Z',
  days: [
    { day: 1, title: 'Foundations', tasks: ['Read chapter', 'Take notes'] },
    { day: 2, title: 'Hydraulics', tasks: ['Solve problems'] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  fixtures.progress = 50;
  fixtures.roadmaps = [ROADMAP];
  fixtures.checkedTasks = { 'roadmap-1': { 1: ['Read chapter'] } };
  fixtures.wrongAnswers = [
    {
      id: 'w-1', question: 'Which ratio links the cylinders?', selectedAnswer: 'B',
      correctAnswer: 'F₁/A₁ = F₂/A₂', explanation: '', topic: 'Hydraulic Pascal Ratio',
      subjectId: 'auto-eng', timestamp: '2026-11-17T09:00:00.000Z',
    },
    {
      id: 'w-2', question: 'What limits thermal efficiency?', selectedAnswer: 'A',
      correctAnswer: 'r_c expansion', explanation: '', topic: 'Diesel Cut-off Ratio',
      subjectId: 'auto-eng', timestamp: '2026-11-17T10:00:00.000Z',
    },
    {
      id: 'w-3', question: 'Which ratio repeats?', selectedAnswer: 'C',
      correctAnswer: 'F₁/A₁ = F₂/A₂', explanation: '', topic: 'Hydraulic Pascal Ratio',
      subjectId: 'auto-eng', timestamp: '2026-11-17T11:00:00.000Z',
    },
  ];
  fixtures.xpEvents = [{ value: 5, timestamp: new Date().toISOString(), source: 'task' }];
  fixtures.quizScores = [];
  fixtures.pendingProgressSync = false;
});

afterEach(() => {
  push.mockReset();
});

describe('Home / Today — real store data, reference structure', () => {
  it('renders the reference order with the learner’s real next task', async () => {
    const tree = await mount();
    const text = allText(tree);

    expect(text).toContain('Wanjiru');
    expect(text).toContain('Study plan');
    expect(text).toContain('Automotive Science');
    expect(text).toContain('Next topic');
    expect(text).toContain('Foundations');
    // First unchecked task, not the checked "Read chapter".
    expect(text).toContain('Continue: Take notes');
    expect(text).not.toContain('Continue: Read chapter');
    expect(text).toContain('50%');
  });

  it('never reproduces sample copy the learner has no data for', async () => {
    const tree = await mount();
    const text = allText(tree);

    expect(text).not.toContain('CAT in');
    expect(text).not.toContain('Nairobi TVET');
    expect(text).not.toContain('Spaced repetition');
    expect(text).not.toContain('5 / 7');
    expect(text).not.toContain('Wanjiru, 19');
  });

  it('ranks weak spots by real mistake count and reviews the latest record', async () => {
    const tree = await mount();
    const text = allText(tree);

    expect(text).toContain('Missed 2× in practice');
    expect(text).toContain('Missed 1× in practice');
    expect(text.indexOf('Hydraulic Pascal Ratio')).toBeLessThan(text.indexOf('Diesel Cut-off Ratio'));

    const review = tree.root
      .findAll((node) => node.props?.accessibilityRole === 'button')
      .find((node) => textUnder(node).includes('Review'));
    expect(review).toBeDefined();
    act(() => review!.props.onPress());
    expect(push).toHaveBeenCalledWith({
      pathname: '/(tabs)/study',
      params: { topic: 'Hydraulic Pascal Ratio', subjectId: 'auto-eng', mode: 'Teach & Quiz' },
    });
  });

  it('shows exactly three quick actions and seven real week cells', async () => {
    const tree = await mount();

    const actionLabels = tree.root
      .findAll((node) => node.props?.accessibilityRole === 'button')
      .map((node) => textUnder(node))
      .filter((label) => ['Import Notes', 'Ask a question', 'Practice'].includes(label));
    expect(new Set(actionLabels)).toEqual(new Set(['Import Notes', 'Ask a question', 'Practice']));

    const weekCells = tree.root.findAll(
      (node) =>
        node.type === View &&
        typeof node.props?.accessibilityLabel === 'string' &&
        /^[MTWFS]: /.test(node.props.accessibilityLabel),
    );
    expect(weekCells).toHaveLength(7);
    expect(allText(tree)).toContain('1 of 7 days had study activity');
  });

  it('drives the hero CTA to the roadmap behind the next task', async () => {
    const tree = await mount();
    const cta = tree.root
      .findAll((node) => node.props?.accessibilityRole === 'button')
      .find((node) => textUnder(node).startsWith('Continue:'));

    expect(cta).toBeDefined();
    act(() => cta!.props.onPress());
    expect(push).toHaveBeenCalledWith('/roadmaps/roadmap-1');
  });

  it('falls back to the empty-plan hero when no roadmap exists', async () => {
    fixtures.roadmaps = [];
    fixtures.checkedTasks = {};
    fixtures.wrongAnswers = [];
    fixtures.xpEvents = [];
    fixtures.quizScores = [];
    fixtures.progress = 0;

    const tree = await mount();
    const text = allText(tree);

    expect(text).toContain('Welcome to EasyTutor');
    expect(text).toContain('Create your first study plan');
    expect(text).not.toContain('Study plan');
    expect(text).toContain('No study activity logged this week — a short session is enough.');
  });

  it('marks a complete plan instead of inventing a next task', async () => {
    fixtures.checkedTasks = { 'roadmap-1': { 1: ['Read chapter', 'Take notes'], 2: ['Solve problems'] } };
    fixtures.progress = 100;

    const tree = await mount();
    const text = allText(tree);

    expect(text).toContain('All tasks complete');
    expect(text).toContain('Create a new plan');
    expect(text).not.toContain('Continue:');
  });
});
