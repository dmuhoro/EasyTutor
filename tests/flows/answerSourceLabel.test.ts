import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { answerSourceLabelKey } from '../../lib/ai/providerLabels';
import { askTutor } from '../../lib/api';
import { t } from '../../src/locales';
import { ChatBubble, type Citation } from '../../components/ui/ChatBubble';
import { resetAICircuitBreakers } from '../../lib/ai/circuitBreaker';
import { resetLocalModelReachability } from '../../lib/ai/endpointPolicy';
import { useSettingsStore } from '../../store/settingsStore';
import { mockSupabase } from '../utils/mockSupabase';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const originalSettings = {
  aiMode: useSettingsStore.getState().aiMode,
  ollamaUrl: useSettingsStore.getState().ollamaUrl,
  ollamaChatModel: useSettingsStore.getState().ollamaChatModel,
};

const jsonResponse = (payload: unknown): Response =>
  ({ ok: true, status: 200, json: async () => payload }) as unknown as Response;

function flatten(value: unknown): string {
  if (value == null || typeof value === 'boolean') return '';
  if (Array.isArray(value)) return value.map(flatten).join('');
  if (typeof value === 'object') return '';
  return String(value);
}

function allText(tree: ReactTestRenderer): string {
  return tree.root
    .findAll((node) => node.type === Text)
    .map((node) => flatten(node.props.children))
    .join(' ');
}

async function renderBubble(
  source: Parameters<typeof ChatBubble>[0]['source'],
  citations: Citation[] = [],
): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = TestRenderer.create(
      React.createElement(ChatBubble, {
        role: 'assistant',
        content: 'An answer',
        source,
        citations,
      }),
    );
  });
  if (!tree) throw new Error('ChatBubble did not render');
  return tree;
}

/** One accessible pressable per chip (the renderer exposes composite + host nodes). */
function citationButtons(tree: ReactTestRenderer) {
  const seen = new Set<string>();
  return tree.root
    .findAll((node) => node.props?.accessibilityRole === 'button'
      && typeof node.props?.onPress === 'function')
    .filter((node) => {
      const label = String(node.props.accessibilityLabel ?? '');
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    });
}

describe('answer source label — network edge mocked only', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    resetAICircuitBreakers();
    resetLocalModelReachability();
    mockSupabase.reset();
    useSettingsStore.setState(originalSettings);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetAICircuitBreakers();
    resetLocalModelReachability();
    useSettingsStore.setState(originalSettings);
  });

  it('maps every source to a truthful label key and fails closed on unknown', () => {
    expect(answerSourceLabelKey('hosted_proxy')).toBe('answeredByHosted');
    expect(answerSourceLabelKey('local_ollama')).toBe('answeredByLocal');
    expect(answerSourceLabelKey('cache')).toBe('answeredByCached');
    expect(answerSourceLabelKey('placeholder')).toBe('answeredByPlaceholder');
    expect(answerSourceLabelKey('offline')).toBe('answeredByOffline');
    expect(answerSourceLabelKey(undefined)).toBe('answeredByUnknown');
    expect(answerSourceLabelKey('unexpected-rail' as never)).toBe('answeredByUnknown');
  });

  it('carries the real rail from fetch through askTutor to the label key', async () => {
    // Only the network edge is stubbed; askTutor, the selector and the
    // reliability wrapper are the real production units under test.
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ content: 'A hosted tutor answer' }));

    const answer = await askTutor('Be a tutor', [{ role: 'user', content: 'Hello' }]);

    expect(answer.success).toBe(true);
    expect(answer.provider).toBe('hosted_proxy');
    expect(answerSourceLabelKey(answer.provider)).toBe('answeredByHosted');
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toMatch(/\/functions\/v1\/ai-proxy$/);
  });

  it('renders the actual hosted-source label on an assistant bubble', async () => {
    const tree = await renderBubble('hosted_proxy');
    expect(allText(tree)).toContain(t('answeredByHosted'));
  });

  it('labels a cached answer truthfully and never claims a model answered', async () => {
    const tree = await renderBubble('cache');
    const text = allText(tree);
    expect(text).toContain(t('answeredByCached'));
    expect(text).not.toContain(t('answeredByHosted'));
  });

  it('renders the offline and unknown fail-closed labels on assistant bubbles', async () => {
    expect(allText(await renderBubble('offline'))).toContain(t('answeredByOffline'));
    expect(allText(await renderBubble(undefined))).toContain(t('answeredByUnknown'));
  });
});

describe('citation excerpt-on-tap — shared ChatBubble', () => {
  it('reveals the retrieved excerpt only after the chip is tapped, and collapses on re-tap', async () => {
    const excerpt = 'Friction resists motion between two surfaces in contact.';
    const tree = await renderBubble('hosted_proxy', [
      { source: 'Physics notes', chapter: 4, page: 12, excerpt },
    ]);

    expect(allText(tree)).not.toContain(excerpt);
    const buttons = citationButtons(tree);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.accessibilityLabel).toContain('Physics notes');

    await act(async () => { buttons[0].props.onPress(); });
    expect(allText(tree)).toContain(excerpt);
    expect(allText(tree)).toContain(t('fromPrivateNotes'));
    expect(citationButtons(tree)[0].props.accessibilityState).toEqual({ expanded: true });

    await act(async () => { citationButtons(tree)[0].props.onPress(); });
    expect(allText(tree)).not.toContain(excerpt);
  });

  it('fails closed: a citation without an excerpt is not a button and never claims one', async () => {
    const tree = await renderBubble('hosted_proxy', [{ source: 'Unavailable source', chapter: 2 }]);
    expect(citationButtons(tree)).toHaveLength(0);
    expect(tree.root.findAll((node) => node.props?.accessibilityRole === 'button')).toHaveLength(0);
    expect(allText(tree)).toContain('Unavailable source');
  });

  it('does not cross-wire excerpts between chips', async () => {
    const firstExcerpt = 'First retrieved passage about gravity.';
    const tree = await renderBubble('hosted_proxy', [
      { source: 'Notes A', excerpt: firstExcerpt },
      { source: 'Notes B', excerpt: 'Second retrieved passage about friction.' },
    ]);

    const buttons = citationButtons(tree);
    expect(buttons).toHaveLength(2);
    await act(async () => { buttons[1].props.onPress(); });
    expect(allText(tree)).toContain('Second retrieved passage about friction.');
    expect(allText(tree)).not.toContain(firstExcerpt);
  });
});
