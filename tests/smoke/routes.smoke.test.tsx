import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import fs from 'node:fs';
import path from 'node:path';

// ── Platform / library mocks (test tooling only) ────────────────────────────
// The native icon and safe-area packages ship JSX / Flow syntax that Vitest
// cannot parse; global host stubs live in tests/setupTests.ts.
vi.mock('expo-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(), replace: vi.fn(), back: vi.fn(),
    path: '/', pathname: '/', query: {}, params: {},
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useLocalSearchParams: vi.fn(() => ({})),
  useSegments: vi.fn(() => []),
  Router: vi.fn(({ children }: { children: React.ReactNode }) => children),
  Link: vi.fn(({ children }: { children: React.ReactNode }) => children),
  Redirect: vi.fn(() => null),
  Stack: Object.assign(
    vi.fn(({ children }: { children: React.ReactNode }) => children),
    { Screen: vi.fn(() => null) },
  ),
  Tabs: Object.assign(
    vi.fn(({ children }: { children: React.ReactNode }) => children),
    { Screen: vi.fn(() => null) },
  ),
  Slot: vi.fn(({ children }: { children: React.ReactNode }) => children),
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: Object.assign(
    vi.fn(() => ({
      session: null, isLoading: false, isOffline: false, user: null,
      signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), resetPassword: vi.fn(),
      syncPendingAuth: vi.fn(async () => {}),
    })),
    { getState: vi.fn(() => ({ session: null })) },
  ),
  syncPendingAuth: vi.fn(async () => {}),
}));

// Toast requires a provider at runtime; the smoke harness mounts routes in
// isolation, so stub the hook/provider with inert host components.
vi.mock('../../components/ui/Toast', () => ({
  useToast: vi.fn(() => ({ show: vi.fn() })),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../store/roadmapStore', () => ({
  portalFromMode: (mode: string) =>
    mode === 'high_school' || mode === 'university' ? mode : 'knowledge_explorer',
  useRoadmapStore: vi.fn(() => ({
    learningMode: 'knowledge_explorer', onboardingComplete: true,
    roadmaps: [], checkedTasks: {}, currentSubject: null, selectedTopic: null,
    setLearningMode: vi.fn(), setOnboardingComplete: vi.fn(),
    fetchSavedRoadmaps: vi.fn(async () => {}), syncQueuedTasks: vi.fn(),
  })),
}));

vi.mock('../../store/progressStore', () => ({
  useProgressStore: vi.fn(() => ({
    studyStreak: 0, xpTotal: 0, weakTopics: [], masteredTopics: [],
    topicsStudied: {}, wrongAnswers: [], checkedTasks: {},
    updateStreak: vi.fn(), syncPendingProgress: vi.fn(),
    getLevel: vi.fn(() => 'Beginner'), getRoadmapProgress: vi.fn(() => 0),
  })),
}));

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: Object.assign(
    vi.fn(() => ({
      aiMode: 'cloud', ollamaUrl: '', ollamaChatModel: '',
      customProvider: null, customApiKey: '', theme: 'dark',
      setAiMode: vi.fn(), setOllamaUrl: vi.fn(),
    })),
    { getState: vi.fn(() => ({ aiMode: 'cloud', ollamaUrl: '', useLocalLLM: false })) },
  ),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: { session: null }, error: null })),
      signUp: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  isSupabaseAvailable: vi.fn(() => true),
}));

vi.mock('@react-native-community/netinfo', () => ({
  useNetInfo: vi.fn(() => ({ isConnected: true })),
  default: { fetch: vi.fn(async () => ({ isConnected: true })) },
}));

vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('LinearGradient', null, children as React.ReactNode),
}));

// ── Real error boundary ─────────────────────────────────────────────────────
// Records every error React catches anywhere in the rendered tree. The test
// fails if even one error is caught — no silent drops.
class CaptureBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// ── Route inventory — derived from disk so a new route cannot go untested ───
const APP_DIR = path.resolve(process.cwd(), 'app');

function listRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listRouteFiles(full));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(path.relative(APP_DIR, full).replace(/\.tsx$/, ''));
    }
  }
  return out.sort();
}

const ROUTE_MODULES = listRouteFiles(APP_DIR).map((rel) => `../../app/${rel}`);

function importPath(module: string): string {
  return path.resolve(process.cwd(), 'tests/smoke', module) + '.tsx';
}

describe('Route smoke — every route mounts inside a real error boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('discovers every route file on disk (no silent omissions)', () => {
    expect(ROUTE_MODULES.length).toBeGreaterThanOrEqual(40);
    // Every discovered module must correspond to a real file.
    for (const module of ROUTE_MODULES) {
      expect(fs.existsSync(importPath(module))).toBe(true);
    }
  });

  for (const module of ROUTE_MODULES) {
    it(`mounts ${module.replace('../../app/', '/')} with no caught render error`, async () => {
      // A failing import MUST fail the test — no catch/return escape hatch.
      const mod = (await import(module)) as { default?: unknown };
      const Component = mod.default;
      expect(typeof Component).toBe('function');

      const errors: Error[] = [];
      let tree: TestRenderer.ReactTestRenderer | undefined;
      await act(async () => {
        tree = TestRenderer.create(
          <CaptureBoundary onError={(error) => errors.push(error)}>
            <React.Suspense fallback={null}>
              {React.createElement(Component as React.ComponentType)}
            </React.Suspense>
          </CaptureBoundary>,
        );
      });

      expect(errors.map((error) => `${error.name}: ${error.message}`)).toEqual([]);
      expect(tree).toBeDefined();
    });
  }
});
