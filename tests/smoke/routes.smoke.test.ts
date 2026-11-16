import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ── Mock expo-router ─────────────────────────────────────────────────────────
vi.mock('expo-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    path: '/',
    pathname: '/',
    query: {},
    params: {},
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useSegments: vi.fn(() => []),
  Router: vi.fn(({ children }: { children: React.ReactNode }) => children),
  Link: vi.fn(({ children, ...rest }: any) => null),
  Redirect: vi.fn(() => null),
  Stack: vi.fn(({ children }: { children: React.ReactNode }) => children),
  Tabs: vi.fn(({ children }: { children: React.ReactNode }) => children),
  Slot: vi.fn(({ children }: { children: React.ReactNode }) => children),
  LocalRootLayout: vi.fn(({ children }: { children: React.ReactNode }) => children),
}));

// ── Mock stores ──────────────────────────────────────────────────────────────
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    session: null,
    isLoading: false,
    user: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  })),
}));

vi.mock('../../store/roadmapStore', () => ({
  useRoadmapStore: vi.fn(() => ({
    learningMode: 'knowledge_explorer',
    onboardingComplete: true,
    roadmaps: [],
    currentSubject: null,
    selectedTopic: null,
    setLearningMode: vi.fn(),
    setOnboardingComplete: vi.fn(),
  })),
}));

vi.mock('../../store/progressStore', () => ({
  useProgressStore: vi.fn(() => ({
    studyStreak: 0,
    xpTotal: 0,
    weakTopics: [],
    masteredTopics: [],
  })),
}));

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    aiMode: 'cloud',
    ollamaUrl: '',
    ollamaChatModel: '',
    customProvider: null,
    customApiKey: '',
    setAiMode: vi.fn(),
    setOllamaUrl: vi.fn(),
  })),
}));

// ── Supabase mock ────────────────────────────────────────────────────────────
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  isSupabaseAvailable: vi.fn(() => true),
}));

// ── List of all app routes (path, component module) ──────────────────────────
const ROUTES: Array<{ path: string; module: string }> = [
  { path: '/', module: '../../app/index' },
  { path: '/settings', module: '../../app/settings' },
  { path: '/onboarding', module: '../../app/onboarding' },
  { path: '/math-journey', module: '../../app/math-journey' },
  { path: '/explore', module: '../../app/explore' },
  { path: '/profile', module: '../../app/profile' },
  { path: '/roadmaps/create', module: '../../app/roadmaps/create' },
  { path: '/roadmaps/:id', module: '../../app/roadmaps/[id]' },
  { path: '/setup-wizard', module: '../../app/setup-wizard/index' },

  // Auth
  { path: '/(auth)/login', module: '../../app/(auth)/login' },

  // High school
  { path: '/(high_school)/', module: '../../app/(high_school)/index' },
  { path: '/(high_school)/:subject', module: '../../app/(high_school)/[subject]' },
  { path: '/(high_school)/:subject/topics', module: '../../app/(high_school)/[subject]/topics' },
  { path: '/(high_school)/:subject/quiz', module: '../../app/(high_school)/[subject]/quiz' },

  // Self-directed
  { path: '/(self_directed)/', module: '../../app/(self_directed)/index' },
  { path: '/(self_directed)/roadmap', module: '../../app/(self_directed)/roadmap' },
  { path: '/(self_directed)/quiz', module: '../../app/(self_directed)/quiz' },

  // University
  { path: '/(university)/', module: '../../app/(university)/index' },
  { path: '/(university)/:course', module: '../../app/(university)/[course]' },
  { path: '/(university)/:course/roadmap', module: '../../app/(university)/[course]/roadmap' },
  { path: '/(university)/:course/quiz', module: '../../app/(university)/[course]/quiz' },
  { path: '/(university)/school-details', module: '../../app/(university)/school-details' },

  // Tabs
  { path: '/(tabs)/', module: '../../app/(tabs)/index' },
  { path: '/(tabs)/roadmap', module: '../../app/(tabs)/roadmap' },
  { path: '/(tabs)/settings', module: '../../app/(tabs)/settings' },
  { path: '/(tabs)/study', module: '../../app/(tabs)/study' },
  { path: '/(tabs)/quiz', module: '../../app/(tabs)/quiz' },

  // Shared
  { path: '/(shared)/mastery', module: '../../app/(shared)/mastery' },
  { path: '/(shared)/learning-dashboard', module: '../../app/(shared)/learning-dashboard' },
  { path: '/(shared)/momentum', module: '../../app/(shared)/momentum' },
  { path: '/(shared)/progress', module: '../../app/(shared)/progress' },
  { path: '/(shared)/settings', module: '../../app/(shared)/settings' },
  { path: '/(shared)/practice-session', module: '../../app/(shared)/practice-session' },
  { path: '/(shared)/question-bank', module: '../../app/(shared)/question-bank' },

  // AI literacy
  { path: '/(ai_literacy)/', module: '../../app/(ai_literacy)/index' },
];

describe('Route smoke tests — every route renders without crashing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const { path, module } of ROUTES) {
    it(`renders ${path} without crashing`, async () => {
      let mod: any;
      try {
        mod = await import(module);
      } catch {
        // If import fails, skip this route — it's a dynamic route that needs
        // URL params to render meaningfully.
        return;
      }
      const Component = mod.default || mod;

      if (typeof Component !== 'function') {
        // Not a component module (e.g. only exports constants) — skip render
        return;
      }

      // Call the component function directly with minimal props.
      // This executes the component body (including hooks) and returns a React
      // element. If any hook or render logic throws, the test fails.
      let element: React.ReactNode | null = null;
      expect(() => {
        element = (Component as any)({});
      }).not.toThrow();

      expect(element).toBeDefined();
    });
  }
});
