/**
 * W1-4/T5 — real-path reliability proof for quiz question generation.
 *
 * The enforcement boundary is `useQuizQuestionGeneration()` in
 * hooks/useOrchestration.ts: it owns cancellation, the offline short-circuit
 * and the bounded delivery deadline, then calls the real
 * `learningOrchestrator.generateQuizQuestion()`. Every test below drives that
 * real hook (via a thin react-test-renderer harness) and spies on the real
 * orchestrator call site — never on a standalone copy of the logic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const controls = vi.hoisted(() => ({
  netConnected: true as boolean | null,
  user: { id: '22222222-2222-4222-8222-222222222222' } as { id: string } | null,
}));

vi.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: controls.netConnected }),
  default: { fetch: async () => ({ isConnected: controls.netConnected }) },
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ user: controls.user, session: null, isLoading: false, isOffline: false }),
}));

vi.mock('../../store/roadmapStore', () => ({
  portalFromMode: (mode: string) => (mode === 'university' ? 'university' : 'high_school'),
  useRoadmapStore: () => ({
    learningMode: 'high_school', subjectId: 'hs-math', topicId: 'linear-equations',
  }),
}));

vi.mock('../../store/progressStore', () => ({
  useProgressStore: () => ({ topicsStudied: {}, wrongAnswers: [], xpTotal: 0 }),
  portalFromSubjectId: () => 'high_school',
  getLevel: () => 'Beginner',
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/quiz',
  useSegments: () => [],
  Stack: Object.assign(() => null, { Screen: () => null }),
  Tabs: Object.assign(() => null, { Screen: () => null }),
  Slot: ({ children }: any) => children,
}));

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ show: vi.fn() }),
  ToastProvider: ({ children }: any) => children,
}));

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: Object.assign(
    () => ({ aiMode: 'cloud', ollamaUrl: '', ollamaChatModel: '' }),
    { getState: () => ({ aiMode: 'cloud', ollamaUrl: '', useLocalLLM: false }) },
  ),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  isSupabaseAvailable: () => true,
}));

vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

import { useQuizQuestionGeneration } from '../../hooks/useOrchestration';
import QuizScreen from '../../screens/tabs/quiz';
import { learningOrchestrator } from '../../src/intelligence';

const okResult = {
  context: {},
  pipeline: {
    output: { question: '2 + 2 = ?', options: ['3', '4', '5', '6'], correct: 1, explanation: 'four' },
  },
  recommendations: [],
} as any;

interface HarnessApi {
  generateQuizQuestion: (overrides?: any, options?: any) => Promise<any>;
  cancel?: () => void;
  loading: boolean;
  error: Error | null;
  question: any;
}

function Harness({ apiRef }: { apiRef: { current: HarnessApi } }) {
  const api = useQuizQuestionGeneration() as HarnessApi;
  apiRef.current = api;
  return React.createElement('text', null,
    api.loading ? 'loading' : api.error ? api.error.message : 'idle');
}

async function mountHarness() {
  const apiRef: { current: HarnessApi } = { current: undefined as unknown as HarnessApi };
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(React.createElement(Harness, { apiRef }));
  });
  return { apiRef, tree };
}

describe('W1-4/T5 quiz generation reliability (real hook, real call site)', () => {
  beforeEach(() => {
    controls.netConnected = true;
    controls.user = { id: '22222222-2222-4222-8222-222222222222' };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('offline: shows an immediate offline message and never calls the orchestrator', async () => {
    controls.netConnected = false;
    const spy = vi.spyOn(learningOrchestrator, 'generateQuizQuestion').mockResolvedValue(okResult);
    const { apiRef, tree } = await mountHarness();

    const start = Date.now();
    await act(async () => {
      await apiRef.current.generateQuizQuestion({ subject_id: 'hs-math', topic_id: 'x' }).catch(() => {});
    });
    const elapsed = Date.now() - start;

    expect(spy).not.toHaveBeenCalled();
    expect(apiRef.current.error?.message).toMatch(/offline/i);
    expect(elapsed).toBeLessThan(1000);
    expect(JSON.stringify(tree.toJSON())).toMatch(/offline/i);
  });

  it('provider failure: friendly error + bounded attempts, well within 35 s', async () => {
    controls.netConnected = true;
    const spy = vi.spyOn(learningOrchestrator, 'generateQuizQuestion')
      .mockRejectedValue(new Error('ai-proxy 503'));
    const { apiRef } = await mountHarness();

    const start = Date.now();
    let caught: Error | undefined;
    await act(async () => {
      try {
        await apiRef.current.generateQuizQuestion({ subject_id: 'hs-math', topic_id: 'x' }, { deadlineMs: 2000 });
      } catch (e) {
        caught = e as Error;
      }
    });
    const elapsed = Date.now() - start;

    expect(caught).toBeDefined();
    expect(caught!.message).toMatch(/try again|couldn.t connect|service is unavailable/i);
    expect(spy.mock.calls.length).toBeLessThanOrEqual(2);
    expect(elapsed).toBeLessThan(35_000);
    expect(apiRef.current.loading).toBe(false);
  });

  it('hanging provider: the deadline aborts and surfaces a friendly timeout', async () => {
    controls.netConnected = true;
    const spy = vi.spyOn(learningOrchestrator, 'generateQuizQuestion')
      .mockImplementation(() => new Promise(() => {})); // never settles — the A5 failure mode
    const { apiRef } = await mountHarness();

    const start = Date.now();
    let caught: Error | undefined;
    await act(async () => {
      try {
        await apiRef.current.generateQuizQuestion({ subject_id: 'hs-math', topic_id: 'x' }, { deadlineMs: 250 });
      } catch (e) {
        caught = e as Error;
      }
    });
    const elapsed = Date.now() - start;

    expect(spy).toHaveBeenCalled();
    expect(caught).toBeDefined();
    expect(caught!.message).toMatch(/timed out|try again/i);
    expect(elapsed).toBeLessThan(1000);
    expect(elapsed).toBeGreaterThanOrEqual(200);
  });

  it('cancel: aborts the in-flight request and leaves no error or stale result', async () => {
    controls.netConnected = true;
    let observedSignal: AbortSignal | undefined;
    vi.spyOn(learningOrchestrator, 'generateQuizQuestion')
      .mockImplementation((_input: any, signal?: AbortSignal) => {
        observedSignal = signal;
        return new Promise((_resolve, reject) =>
          signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
      });
    const { apiRef } = await mountHarness();

    expect(typeof apiRef.current.cancel).toBe('function');

    const settled: { caught?: Error } = {};
    await act(async () => {
      // Attach the rejection handler at creation time so the abort cannot be
      // reported as unhandled between the cancel act and the assertion act.
      void apiRef.current.generateQuizQuestion({ subject_id: 'hs-math', topic_id: 'x' })
        .catch((e) => { settled.caught = e as Error; });
    });

    await act(async () => {
      apiRef.current.cancel!();
    });

    await act(async () => { await Promise.resolve(); });

    expect(observedSignal).toBeDefined();
    expect(observedSignal!.aborted).toBe(true);
    expect(settled.caught).toBeDefined();
    expect(apiRef.current.error).toBeNull();
    expect(apiRef.current.question).toBeNull();
    expect(apiRef.current.loading).toBe(false);
  });

  it('SCREEN: offline renders an immediate offline message; no generation is attempted', async () => {
    controls.netConnected = false;
    const spy = vi.spyOn(learningOrchestrator, 'generateQuizQuestion').mockResolvedValue(okResult);
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(QuizScreen));
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toMatch(/offline/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it('SCREEN: provider failure renders a friendly error + Retry, and Retry re-invokes the real call', async () => {
    controls.netConnected = true;
    const spy = vi.spyOn(learningOrchestrator, 'generateQuizQuestion')
      .mockRejectedValue(new Error('ai-proxy 503'));
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(QuizScreen));
    });
    // One bounded retry with 200 ms backoff runs before the friendly error is
    // surfaced; wait for it rather than weakening the assertion.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 700)); });

    let json = JSON.stringify(tree.toJSON());
    expect(json).toMatch(/couldn.t reach the learning service/i);
    expect(json).toMatch(/Retry/);

    const retryText = tree.root.findAll(
      (n) => (n.type as unknown) === 'Text'
        && n.children.some((c) => typeof c === 'string' && c === 'Retry'),
    )[0];
    expect(retryText).toBeDefined();
    let retry = retryText.parent;
    while (retry && typeof retry.props?.onPress !== 'function') retry = retry.parent;
    expect(retry).toBeDefined();
    const callsBefore = spy.mock.calls.length;
    await act(async () => { retry!.props.onPress(); });
    expect(spy.mock.calls.length).toBe(callsBefore + 1);
  });

  it('unmount cancels an in-flight request (no stale work after teardown)', async () => {
    controls.netConnected = true;
    let observedSignal: AbortSignal | undefined;
    vi.spyOn(learningOrchestrator, 'generateQuizQuestion')
      .mockImplementation((_input: any, signal?: AbortSignal) => {
        observedSignal = signal;
        return new Promise(() => {});
      });
    const { apiRef, tree } = await mountHarness();

    await act(async () => {
      void apiRef.current.generateQuizQuestion({ subject_id: 'hs-math', topic_id: 'x' }).catch(() => {});
    });
    await act(async () => {
      tree.unmount();
    });

    expect(observedSignal).toBeDefined();
    expect(observedSignal!.aborted).toBe(true);
  });
});
