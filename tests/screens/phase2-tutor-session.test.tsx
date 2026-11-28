/**
 * G-02 — route-level proof that the wired /tutor/session deep link answers from
 * governed retrieval with real citations, and fails closed when notes are absent.
 *
 * The unit under test is the REAL route (app/tutor/session.tsx -> the Phase 2
 * screen). Only the retrieval and AI network edges are substituted; citation
 * building, marker integrity and the ChatBubble are the real production units.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const markers = vi.hoisted(() => ({
  retrieve: vi.fn(async (_q: string, _ctx?: unknown, _opts?: unknown) => [] as Array<{
    content: string;
    similarity: number;
    metadata?: Record<string, unknown>;
  }>),
  askTutor: vi.fn(async (_prompt: string, _messages?: unknown) => ({
    success: true as boolean,
    data: '' as string | undefined,
    provider: 'hosted_proxy' as string,
  })),
  back: vi.fn(),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: markers.back, setParams: vi.fn() }),
  useLocalSearchParams: () => ({ subject: 'hs-math', topic: 'linear-equations' }),
  usePathname: () => '/tutor/session',
}));

vi.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
  default: { fetch: async () => ({ isConnected: true }) },
}));

vi.mock('../../store/roadmapStore', () => ({
  useRoadmapStore: () => ({ learningMode: 'high_school' }),
  portalFromMode: () => 'high_school',
}));

vi.mock('../../lib/retrieval', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, retrieveRelevantChunks: markers.retrieve };
});

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, askTutor: markers.askTutor };
});

// Preload the lazy target so the route mounts the real screen.
const preloaded = await import('../../screens/tutor/session');
void preloaded;

import TutorRoute from '../../app/tutor/session';
import { useStudyStore } from '../../store/studyStore';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const QUESTION = 'What is photosynthesis?';
const EXCERPT = 'Photosynthesis converts light into glucose inside chloroplasts.';
const ANSWER = '[Bird Ch15 p.171] Yes — plants convert light into chemical energy.';
const CHUNKS = [{
  content: EXCERPT,
  similarity: 0.91,
  metadata: { source: 'Bird', chapter_no: 15, page: 171 },
}];

let tree: TestRenderer.ReactTestRenderer | undefined;

function findInput(root: TestRenderer.ReactTestInstance) {
  return root.findAll(
    (n) => String(n.type) === 'TextInput' && typeof n.props?.onChangeText === 'function',
  )[0];
}

async function sendMessage(): Promise<void> {
  const input = findInput(tree!.root);
  expect(input).toBeDefined();
  await act(async () => { input.props.onChangeText(QUESTION); });

  const refreshed = findInput(tree!.root);
  expect(refreshed).toBeDefined();
  await act(async () => { await refreshed.props.onSubmitEditing(); });
}

async function mountRoute(): Promise<void> {
  await act(async () => {
    tree = TestRenderer.create(
      <React.Suspense fallback={null}>
        <TutorRoute />
      </React.Suspense>,
    );
  });
}

describe('Wired /tutor/session route — governed cited answers', () => {
  beforeEach(() => {
    markers.retrieve.mockReset();
    markers.askTutor.mockReset();
    act(() => { useStudyStore.setState({ chatHistory: {}, pendingAIRequests: [] }); });
  });

  afterEach(() => {
    tree?.unmount();
    tree = undefined;
  });

  it('retrieves governed notes, prompts with them, and renders cited excerpts with the real source label', async () => {
    markers.retrieve.mockResolvedValue(CHUNKS);
    markers.askTutor.mockResolvedValue({ success: true, data: ANSWER, provider: 'hosted_proxy' });

    await mountRoute();
    await sendMessage();

    expect(markers.retrieve).toHaveBeenCalledTimes(1);
    const context = markers.retrieve.mock.calls[0][1] as Record<string, unknown>;
    expect(context.taxonomy_scope).toBe('hs-math');
    expect(context.curriculum_scope).toBe('KICD_KCSE');

    expect(markers.askTutor).toHaveBeenCalledTimes(1);
    const prompt = markers.askTutor.mock.calls[0][0];
    expect(prompt).toContain(EXCERPT);
    expect(prompt).toContain('CITE YOUR SOURCES');
    expect(prompt).not.toContain('You are a helpful tutor for');

    // Non-empty citation chip with the retrieved source. The same logical chip
    // appears at composite and host levels, so count distinct labels.
    const chipLabels = new Set(
      tree!.root.findAll(
        (n) => typeof n.props?.['aria-label'] === 'string'
          && n.props['aria-label'].includes('Bird'),
      ).map((n) => n.props['aria-label'] as string),
    );
    expect(chipLabels.size).toBe(1);
    const chip = tree!.root.findAll(
      (n) => typeof n.props?.onPress === 'function'
        && typeof n.props?.['aria-label'] === 'string'
        && n.props['aria-label'].includes('Bird'),
    )[0];
    expect(chip).toBeDefined();

    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('Answered by: hosted tutor');
    expect(json).not.toContain(EXCERPT); // excerpt hidden until tap
    await act(async () => { chip.props.onPress(); });
    const opened = JSON.stringify(tree!.toJSON());
    expect(opened).toContain(EXCERPT);
    expect(opened).toContain('From your private notes');
  });

  it('offers a visible Stitch-style way back from the tutor session', async () => {
    markers.back.mockReset();
    await mountRoute();

    const back = tree!.root.findAll(
      (n) => n.props?.accessibilityRole === 'button'
        && n.props?.accessibilityLabel === 'Back',
    )[0];
    expect(back).toBeDefined();
    act(() => back.props.onPress());
    expect(markers.back).toHaveBeenCalledTimes(1);
  });

  it('fails closed to an honest not-in-notes state when retrieval returns nothing', async () => {
    markers.retrieve.mockResolvedValue([]);

    await mountRoute();
    await sendMessage();

    expect(markers.askTutor).not.toHaveBeenCalled();
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('Not in your notes yet');
    expect(json).not.toContain('Bird');
  });
});
