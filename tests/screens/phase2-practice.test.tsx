/**
 * G-01 — route-level proof that the wired /practice deep link serves a governed
 * quiz and records progress, never a fabricated "capital of …" question.
 *
 * The unit under test is the REAL route (app/practice/index.tsx -> the Phase 2
 * screen). Only the network/governed boundaries are substituted with spies;
 * the screen, the orchestration hook and the deadline logic are not mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const markers = vi.hoisted(() => ({
  addQuizScore: vi.fn(async (
    _score: number,
    _total: number,
    _topic: string,
    _subjectId: string,
    _topicId?: string,
    _weakPoints?: string[],
  ) => undefined),
  recordWrongAnswer: vi.fn(),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), setParams: vi.fn() }),
  useLocalSearchParams: () => ({ topic: 'linear-equations', subjectId: 'hs-math', total: '1' }),
  usePathname: () => '/practice',
}));

vi.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
  default: { fetch: async () => ({ isConnected: true }) },
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ user: { id: '11111111-1111-4111-8111-111111111111' } }),
}));

vi.mock('../../store/roadmapStore', () => ({
  useRoadmapStore: () => ({
    learningMode: 'high_school',
    subjectId: 'hs-math',
    topicId: 'linear-equations',
  }),
  portalFromMode: () => 'high_school',
}));

vi.mock('../../store/progressStore', () => ({
  useProgressStore: () => ({
    topicsStudied: {},
    addQuizScore: markers.addQuizScore,
    recordWrongAnswer: markers.recordWrongAnswer,
  }),
  portalFromSubjectId: () => 'high_school',
  getLevel: () => 'Beginner',
}));

// Preload the lazy target so the route mounts the real screen, not <RouteFallback />.
const preloadedScreen = await import('../../screens/practice/index');
void preloadedScreen;

import PracticeRoute from '../../app/practice/index';
import { learningOrchestrator } from '../../src/intelligence';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const governedResult = {
  context: {},
  pipeline: {
    output: {
      question: 'Solve 2x + 4 = 10 for x.',
      options: ['x = 1', 'x = 3', 'x = 4', 'x = 6'],
      correct: 1,
      explanation: 'Subtract 4 from both sides, then divide by 2.',
    },
  },
  recommendations: [],
};

async function mountRoute(): Promise<TestRenderer.ReactTestRenderer> {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <React.Suspense fallback={null}>
        <PracticeRoute />
      </React.Suspense>,
    );
  });
  return tree;
}

describe('Wired /practice route — governed quiz', () => {
  beforeEach(() => {
    markers.addQuizScore.mockClear();
    markers.recordWrongAnswer.mockClear();
    vi.restoreAllMocks();
  });

  it('renders the governed question and never the fabricated placeholder', async () => {
    const generate = vi.spyOn(learningOrchestrator, 'generateQuizQuestion')
      .mockResolvedValue(governedResult as never);

    const tree = await mountRoute();

    expect(generate).toHaveBeenCalled();
    const input = generate.mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(input.subject_id).toBe('hs-math');
    expect(input.topic_id).toBe('linear-equations');

    // The explanation is revealed only after the learner answers.
    const option = tree.root.findAll(
      (n) => n.props?.['aria-label'] === 'Option x = 1' && typeof n.props?.onPress === 'function',
    )[0];
    expect(option).toBeDefined();
    await act(async () => { option.props.onPress(); });

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Solve 2x + 4 = 10 for x.');
    expect(json).toContain('Subtract 4 from both sides, then divide by 2.');
    expect(json).not.toContain('What is the capital of');
    expect(json).not.toContain('Option A');
  });

  it('records a wrong answer and the final score through the governed progress store', async () => {
    vi.spyOn(learningOrchestrator, 'generateQuizQuestion')
      .mockResolvedValue(governedResult as never);

    const tree = await mountRoute();

    // Choose the wrong option ("x = 4") via the real QuizOption control.
    const wrongOption = tree.root.findAll(
      (n) => n.props?.['aria-label'] === 'Option x = 4' && typeof n.props?.onPress === 'function',
    )[0];
    expect(wrongOption).toBeDefined();
    await act(async () => { wrongOption.props.onPress(); });

    expect(markers.recordWrongAnswer).toHaveBeenCalledTimes(1);
    const record = markers.recordWrongAnswer.mock.calls[0][0] as Record<string, unknown>;
    expect(record.question).toBe('Solve 2x + 4 = 10 for x.');
    expect(record.correctAnswer).toBe('x = 3');
    expect(record.subjectId).toBe('hs-math');

    const finishLabel = tree.root.findAll(
      (n) => typeof n.props?.children === 'string' && /Finish Quiz/i.test(n.props.children),
    )[0];
    expect(finishLabel).toBeDefined();
    let next = finishLabel.parent;
    while (next && typeof next.props?.onPress !== 'function') next = next.parent;
    expect(next).toBeDefined();
    await act(async () => { next!.props.onPress(); });

    expect(markers.addQuizScore).toHaveBeenCalledTimes(1);
    const score = markers.addQuizScore.mock.calls[0];
    expect(score[0]).toBe(0);
    expect(score[1]).toBe(1);
    expect(score[3]).toBe('hs-math');
  });

  it('fails closed to an error state when governed generation is unavailable', async () => {
    vi.spyOn(learningOrchestrator, 'generateQuizQuestion')
      .mockRejectedValue(new Error('learning service unavailable'));

    const tree = await mountRoute();
    // Bounded retry with 200 ms backoff runs before the friendly error surfaces.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 700)); });

    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain('What is the capital of');
    expect(json).toMatch(/couldn.t reach the learning service|try again/i);
    expect(markers.addQuizScore).not.toHaveBeenCalled();
  });
});
