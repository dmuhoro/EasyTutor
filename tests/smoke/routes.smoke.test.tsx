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
    getRoadmapProgress: vi.fn(() => 0),
    fetchSavedRoadmaps: vi.fn(async () => {}), syncQueuedTasks: vi.fn(),
  })),
}));

vi.mock('../../store/progressStore', () => ({
  // Standalone export consumed by several screens (getLevel(xpTotal)).
  getLevel: (xp: number) => (xp >= 1000 ? 'Advanced' : xp >= 100 ? 'Intermediate' : 'Beginner'),
  useProgressStore: vi.fn(() => ({
    studyStreak: 0, xpTotal: 0, weakTopics: [], masteredTopics: [],
    topicsStudied: {}, wrongAnswers: [], checkedTasks: {},
    xpEvents: [], quizScores: [], lastOpenedDate: '', pendingProgressSync: false,
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

// ProgressRing imports react-native-svg/reanimated; their real builds ship
// syntax the Node loader cannot parse. Render inert host stubs so the real
// screen modules can be imported and mounted.
vi.mock('react-native-svg', () => {
  const host = (tag: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(tag, props, children as React.ReactNode);
  return { default: host('Svg'), Circle: host('Circle'), Path: host('Path'), Rect: host('Rect') };
});
vi.mock('react-native-reanimated', () => ({
  default: Object.assign(
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('AnimatedView', props, children as React.ReactNode),
    { createAnimatedComponent: () => (props: Record<string, unknown>) =>
        React.createElement('AnimatedComponent', props) },
  ),
  useAnimatedProps: (cb: () => unknown) => cb,
  useSharedValue: (value: unknown) => ({ value }),
  withSpring: (value: unknown) => value,
  withTiming: (value: unknown) => value,
}));

// Vite's glob macro is a transform-time helper; the repo tsconfig does not
// include vite/client types, so declare just the shape used here.
type ViteImportMeta = ImportMeta & {
  glob(pattern: string, options?: { eager?: boolean }): Record<string, unknown>;
};

// Eagerly preload every lazy screen module. Each app route wraps its screen in
// React.lazy(() => import('../../screens/...')); without a preload the import
// was still in flight when act() completed, so the old gate only ever mounted
// <RouteFallback /> and never exercised a real screen — a false gate. Vite
// expands this glob to literal imports at transform time (a computed
// import(specifier) would fall back to Node's CJS loader and fail on raw TS).
const SCREEN_MODULES = (import.meta as ViteImportMeta)
  .glob('../../screens/**/*.tsx', { eager: true });

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
    // Exact count, not a floor: a floor lets a dropped route pass as long as
    // "enough" routes remain, which is exactly how a dead route hides. Adding
    // or removing a route is a deliberate act that must update this number.
    expect(ROUTE_MODULES).toHaveLength(40);
    // Every discovered module must correspond to a real file.
    for (const module of ROUTE_MODULES) {
      expect(fs.existsSync(importPath(module))).toBe(true);
    }
    // Critical routes the product cannot ship without. Count alone would not
    // catch a swap; this list names the screens a learner actually uses.
    const critical = [
      'app/(tabs)/index.tsx',
      'app/(tabs)/study.tsx',
      'app/(tabs)/quiz.tsx',
      'app/(tabs)/library.tsx',
      'app/(tabs)/you.tsx',
      'app/high-school/index.tsx',
      'app/university/index.tsx',
      'app/self-directed/index.tsx',
      'app/ai-literacy.tsx',
      'app/(auth)/login.tsx',
    ];
    for (const route of critical) {
      expect(ROUTE_MODULES).toContain(`../../${route.replace(/\.tsx$/, '')}`);
    }
    // Every lazy screen target must be preloaded before mounting, otherwise
    // the gate silently tests only <RouteFallback /> and never a real screen.
    expect(Object.keys(SCREEN_MODULES).length).toBeGreaterThanOrEqual(30);
  });

  // Regression (W1-4/T4): two catalogued subjects (uni-law, uni-business) have
  // no topics. The old getRandomTopic() indexed into one unconditionally and
  // threw an unhandled rejection from the mount effect when random selection
  // landed on them (~10% of mounts). Force that index to prove the real quiz
  // route mounts cleanly regardless of which subject is selected.
  it('quiz mount survives the empty-topics subject selection', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.82); // -> index 17: uni-law, 0 topics
    try {
      const mod = (await import('../../app/(tabs)/quiz')) as { default?: unknown };
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
    } finally {
      randomSpy.mockRestore();
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
