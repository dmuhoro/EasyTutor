import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const writer = vi.hoisted(() => vi.fn(async (): Promise<
  | { ok: true }
  | { ok: false; code: 'network'; message: string; retryable: true }
> => ({ ok: true })));
const navigation = vi.hoisted(() => ({ back: vi.fn(), replace: vi.fn() }));

vi.mock('../../src/infrastructure/evidence', () => ({
  supabaseEvidenceWriter: { write: writer },
}));
vi.mock('expo-router', () => ({ useRouter: () => navigation }));

import MathJourneyScreen from '../../screens/math-journey';
import { useAuthStore } from '../../store/authStore';
import { useMathJourneyStore } from '../../store/mathJourneyStore';

const LEARNER_ID = '11111111-1111-4111-8111-111111111111';
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function flatten(value: unknown): string {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (Array.isArray(value)) return value.map(flatten).join('');
  if (typeof value === 'object') return '';
  return String(value);
}

function textUnder(node: ReactTestInstance): string {
  return node.findAll((child) => child.type === Text).map((child) => flatten(child.props.children)).join(' ');
}

function button(tree: ReactTestRenderer, label: string): ReactTestInstance {
  const result = tree.root.findAll((node) => node.type === TouchableOpacity).find((node) => textUnder(node).includes(label));
  if (!result) throw new Error(`Button not found: ${label}`);
  return result;
}

function session() {
  useAuthStore.getState().setSession({
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_at: 9999999999,
    expires_in: 9999999999,
    token_type: 'bearer',
    user: {
      id: LEARNER_ID,
      email: 'learner@example.test',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00Z',
    },
  });
}

async function mount(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(MathJourneyScreen)); });
  return tree;
}

describe('Mathematics route authenticated evidence interaction', () => {
  beforeEach(() => {
    useMathJourneyStore.getState().reset();
    useAuthStore.getState().setSession(null);
    writer.mockReset();
    writer.mockResolvedValue({ ok: true });
    navigation.back.mockReset();
    navigation.replace.mockReset();
  });

  it('blocks the assessment until there is an authenticated account', async () => {
    const tree = await mount();
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
    expect(tree.root.findAllByType(TouchableOpacity).some((node) => textUnder(node).includes('Go to sign in'))).toBe(true);
  });

  it('submits a real answer, derives evidence and syncs through the configured writer', async () => {
    session();
    const tree = await mount();
    await act(async () => { button(tree, 'Start fractions diagnostic').props.onPress(); });

    const input = tree.root.findByType(TextInput);
    await act(async () => { input.props.onChangeText('3/4'); });
    await act(async () => { await button(tree, 'Submit answer').props.onPress(); });

    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer).toHaveBeenCalledWith(expect.objectContaining({
      userId: LEARNER_ID,
      itemId: 'math-frac-1',
      response: '3/4',
      score: 1,
      activityId: 'diagnostic',
    }));
    expect(useMathJourneyStore.getState().canonical?.learnerId).toBe(LEARNER_ID);
    expect(useMathJourneyStore.getState().canonical?.syncState).toBe('synced');
    const text = tree.root.findAll((node) => node.type === Text).map((node) => flatten(node.props.children)).join(' ');
    expect(text).toContain('Correct answer');
    // The real screen, not only the store, renders the canonical projection.
    expect(text).toContain('Mastery confidence: 50%');
  });

  it('keeps the local result visible and reports a writer failure', async () => {
    session();
    writer.mockResolvedValue({ ok: false, code: 'network', message: 'offline', retryable: true });
    const tree = await mount();
    await act(async () => { button(tree, 'Start fractions diagnostic').props.onPress(); });
    await act(async () => { tree.root.findByType(TextInput).props.onChangeText('wrong'); });
    await act(async () => { await button(tree, 'Submit answer').props.onPress(); });

    expect(useMathJourneyStore.getState().canonical?.evidenceCount).toBe(1);
    expect(useMathJourneyStore.getState().canonical?.syncState).toBe('pending');
    expect(useMathJourneyStore.getState().lastError).toMatch(/offline/i);
    expect(tree.root.findAll((node) => node.props.accessibilityRole === 'alert')
      .some((node) => textUnder(node).includes('offline'))).toBe(true);
  });
});
