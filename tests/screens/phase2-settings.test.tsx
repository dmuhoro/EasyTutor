import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// The Phase 2 settings screen carries the live Ollama config and portal switch
// into the design refresh. This test mounts the REAL route (app/settings.tsx),
// so a wrapper that silently falls back to the older screens/settings.tsx fails.

const markers = vi.hoisted(() => ({
  setUseLocalLLM: vi.fn(),
  setOllamaUrl: vi.fn(),
  setOllamaChatModel: vi.fn(),
  setOllamaEmbeddingModel: vi.fn(),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/settings',
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    user: { email: 'wanjiru@example.test' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../store/progressStore', () => ({
  useProgressStore: () => ({
    studyStreak: 3,
    xpTotal: 120,
    getLevel: () => 'Beginner',
  }),
}));

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: () => ({
    theme: 'dark',
    lowDataMode: false,
    setTheme: vi.fn(),
    setLowDataMode: vi.fn(),
    useLocalLLM: false,
    setUseLocalLLM: markers.setUseLocalLLM,
    ollamaUrl: 'http://192.168.1.20:11434',
    setOllamaUrl: markers.setOllamaUrl,
    ollamaChatModel: 'qwen2.5:1.5b',
    setOllamaChatModel: markers.setOllamaChatModel,
    ollamaEmbeddingModel: 'nomic-embed-text',
    setOllamaEmbeddingModel: markers.setOllamaEmbeddingModel,
  }),
}));

vi.mock('../../store/roadmapStore', () => ({
  useRoadmapStore: () => ({
    learningMode: 'high_school',
    setLearningMode: vi.fn(),
  }),
}));

vi.mock('../../lib/ollamaModels', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/ollamaModels')>();
  return {
    ...actual,
    checkOllamaModelAvailability: vi.fn(async () => ({
      reasoning: 'available',
      agent: 'unknown',
      coding: 'unknown',
      embedding: 'not_pulled',
    })),
  };
});

vi.mock('../../components/ui/PortalSwitcher', () => ({
  PortalSwitcher: () => React.createElement('PortalSwitcherMarker'),
}));

// Preload the lazy target so the route mounts the real screen, not <RouteFallback />.
const preloadedScreen = await import('../../screens/settings/index');
void preloadedScreen;

import SettingsRoute from '../../app/settings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function allText(tree: TestRenderer.ReactTestRenderer): string {
  return JSON.stringify(tree.toJSON());
}

describe('Phase 2 settings route — behaviour parity', () => {
  it('mounts the Phase 2 screen with Ollama config, model status and portal switch', async () => {
    const errors: Error[] = [];
    class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() { return { failed: true }; }
      componentDidCatch(error: Error) { errors.push(error); }
      render() { return this.state.failed ? null : this.props.children; }
    }

    let tree: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = TestRenderer.create(
        <Boundary>
          <React.Suspense fallback={null}>
            <SettingsRoute />
          </React.Suspense>
        </Boundary>,
      );
    });

    expect(errors.map((e) => e.message)).toEqual([]);
    expect(tree).toBeDefined();
    const text = allText(tree!);

    // Only the Phase 2 screen uses this new locale string; the older
    // screens/settings.tsx says "powers Polymath RAG" instead.
    expect(text).toContain('powers document retrieval');
    expect(text).toContain('Ollama Server URL');
    expect(text).toContain('Reasoning / Chat');
    expect(text).toContain('Embedding / RAG');
    expect(text).toContain('Model Slots');
    expect(text).toContain('NOT PULLED');
    expect(text).toContain('AVAILABLE');
    expect(tree!.root.findAll((n) => String(n.type) === 'PortalSwitcherMarker')).toHaveLength(1);
  });
});
