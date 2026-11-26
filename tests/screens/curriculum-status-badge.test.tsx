import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * E7-T2 — the learner sees the real source_status of the curriculum pack that
 * supplies the routed subject. The runtime mock preserves the real bundled
 * pack and overrides only its status so OFFICIAL can be tested without
 * inventing a second curriculum source.
 */
const fx = vi.hoisted(() => ({
  subject: 'tvet-ke-automotive',
  name: 'Automotive Engineering',
  status: 'DRAFT' as 'DRAFT' | 'OFFICIAL' | 'COMMUNITY',
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useLocalSearchParams: () => ({ subject: fx.subject, name: fx.name }),
}));

vi.mock('../../lib/haptics', () => ({ impactAsync: vi.fn() }));

vi.mock('../../store/roadmapStore', () => ({
  useRoadmapStore: () => ({ setTopicId: vi.fn() }),
}));

vi.mock('../../data/knowledgeStore', () => ({
  getLocalTopics: async () => [{ id: 't1', name: 'Engine Systems' }],
  getAllProgress: async () => ({}),
}));

vi.mock('../../components/SyncIndicator', () => ({ SyncIndicator: () => null }));

vi.mock('../../components/TopicList', () => ({
  TopicList: ({ topics }: { topics: { title: string }[] }) =>
    React.createElement('TopicList', null, topics.map((topic) => topic.title).join(',')),
}));

vi.mock('../../lib/curriculum/runtime', async (importActual) => {
  const actual = await importActual<typeof import('../../lib/curriculum/runtime')>();
  return {
    ...actual,
    allBundledPacks: () =>
      actual.allBundledPacks().map((pack) => ({ ...pack, source_status: fx.status })),
  };
});

import SubjectTopics from '../../screens/high_school/[subject]/topics';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(): Promise<string> {
  let tree: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = TestRenderer.create(React.createElement(SubjectTopics));
  });
  if (!tree) throw new Error('topics screen did not render');

  const parts: string[] = [];
  const visit = (value: unknown): void => {
    if (value == null || typeof value === 'boolean') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object') return;
    parts.push(String(value));
  };
  for (const node of tree.root.findAll(() => true)) visit(node.props.children);
  return parts.join(' ');
}

beforeEach(() => {
  fx.subject = 'tvet-ke-automotive';
  fx.name = 'Automotive Engineering';
  fx.status = 'DRAFT';
});

describe('E7-T2 — curriculum source status on the real topics screen', () => {
  it('labels a bundled DRAFT subject as not official and needing review', async () => {
    const text = await mount();
    expect(text).toContain('Automotive Engineering');
    expect(text).toMatch(/DRAFT/);
    expect(text).toMatch(/NOT OFFICIAL/i);
    expect(text).toMatch(/NEEDS REVIEW/i);
  });

  it('claims OFFICIAL only when the pack itself says OFFICIAL', async () => {
    fx.status = 'OFFICIAL';
    const text = await mount();
    expect(text).toMatch(/OFFICIAL/);
    expect(text).not.toMatch(/DRAFT/);
    expect(text).not.toMatch(/NEEDS REVIEW/i);
  });

  it('shows no status claim when the routed subject has no bundled pack', async () => {
    fx.subject = 'algebra';
    fx.name = 'Algebra';
    const text = await mount();
    expect(text).not.toMatch(/DRAFT/);
    expect(text).not.toMatch(/OFFICIAL/);
    expect(text).not.toMatch(/COMMUNITY/);
  });
});
