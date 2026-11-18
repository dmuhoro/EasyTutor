import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import fs from 'node:fs';
import path from 'node:path';

// ── Harness boundary ─────────────────────────────────────────────────────────
// The production module under test is app/(tabs)/_layout.tsx. Expo Router's
// <Tabs> renders the native tab bar in the real app; this harness replaces it
// with an ARIA tablist so keyboard/focus events can be driven under Vitest.
// Assertions are about the *declarations the real layout supplies* (routes,
// labels, selected pathname). Keyboard mechanics are the ARIA tablist contract,
// not a claim about Expo Router internals; browser-level proof is W1-5 scope.

const push = vi.fn();
const ROUTES = ['/index', '/study', '/quiz', '/library', '/you'];
let currentPath = '/';
let focusIndex = 0;
let rerender: () => void = () => {};
const setPath = (p: string) => {
  currentPath = p;
  const key = p === '/' ? '/index' : p;
  focusIndex = Math.max(0, ROUTES.indexOf(key));
};

function moveFocus(delta: number, total: number) {
  focusIndex = (focusIndex + delta + total) % total;
  rerender();
}

type ScreenElement = React.ReactElement<{
  name: string;
  options?: { title?: string; tabBarLabel?: string; href?: string | null };
}>;

function TabButton({ screen, index, total }: { screen: ScreenElement; index: number; total: number }) {
  const name = String(screen.props.name);
  const options = screen.props.options ?? {};
  const label = options.tabBarLabel ?? options.title ?? name;
  const route = `/${name}`;
  const selected = currentPath === route || (currentPath === '/' && name === 'index');
  const focused = focusIndex === index;

  return React.createElement('TabButton', {
    role: 'tab',
    'aria-label': label,
    'aria-selected': selected,
    tabIndex: selected || focused ? 0 : -1,
    'data-route': route,
    'data-focused': focused ? 'true' : 'false',
    onFocus: () => { focusIndex = index; rerender(); },
    onKeyDown: (e: { key: string }) => {
      if (e.key === 'ArrowRight') moveFocus(1, total);
      if (e.key === 'ArrowLeft') moveFocus(-1, total);
      if (e.key === 'Home') { focusIndex = 0; rerender(); }
      if (e.key === 'End') { focusIndex = total - 1; rerender(); }
      if (e.key === 'Enter' || e.key === ' ') {
        push(route);
      }
    },
    onPress: () => push(route),
  });
}

vi.mock('expo-router', () => {
  const Tabs = ({ children }: { children: React.ReactNode }) => {
    // A screen with `href: null` is a route, not a tab — same rule expo-router
    // applies in the real tab bar.
    const screens = (React.Children.toArray(children).filter(React.isValidElement) as ScreenElement[])
      .filter((screen) => screen.props.options?.href !== null);
    return React.createElement(
      'TabList',
      { role: 'tablist', 'data-testid': 'tablist', 'data-count': screens.length },
      screens.map((screen, index) =>
        React.createElement(TabButton, { key: String(screen.props.name), screen, index, total: screens.length }),
      ),
    );
  };
  Tabs.Screen = () => null;
  return {
    Tabs,
    usePathname: () => currentPath,
    useSegments: () => currentPath.split('/').filter(Boolean),
    useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
    Redirect: () => null,
    Stack: Object.assign(({ children }: { children: React.ReactNode }) => children, { Screen: () => null }),
    Slot: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({ theme: 'dark' })),
}));
vi.mock('../../components/SyncIndicator', () => ({
  SyncIndicator: () => React.createElement('SyncIndicator'),
}));
vi.mock('../../lib/supabase', () => ({
  isSupabaseAvailable: vi.fn(() => true),
  supabase: { auth: {} },
}));

const APP_TABS_DIR = path.resolve(process.cwd(), 'app/(tabs)');
const LAYOUT_SOURCE = fs.readFileSync(path.join(APP_TABS_DIR, '_layout.tsx'), 'utf8');

async function mountLayout() {
  const mod = await import('../../app/(tabs)/_layout');
  let tree: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = TestRenderer.create(React.createElement(mod.default));
  });
  rerender = () => {
    act(() => {
      tree!.update(React.createElement(mod.default));
    });
  };
  return tree!;
}

describe('Real tab navigation — one home, five accessible tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPath('/');
  });

  it('has exactly one route owning / (no CommandCenter shadow outside tabs)', () => {
    const rootIndex = path.resolve(process.cwd(), 'app/index.tsx');
    expect(fs.existsSync(rootIndex)).toBe(false);
    expect(fs.existsSync(path.join(APP_TABS_DIR, 'index.tsx'))).toBe(true);
  });

  it('does not leave duplicate/dead navigation or dashboard components behind', () => {
    expect(fs.existsSync(path.resolve(process.cwd(), 'components/NavigationBar.tsx'))).toBe(false);
    expect(fs.existsSync(path.resolve(process.cwd(), 'components/CommandCenter.tsx'))).toBe(false);
  });

  it('declares exactly five tabs with labels mapped to existing route files', async () => {
    const tree = await mountLayout();
    const list = tree.root.findByProps({ role: 'tablist' });
    expect(Number(list.props['data-count'])).toBe(5);

    const buttons = tree.root.findAllByProps({ role: 'tab' });
    expect(buttons).toHaveLength(5);
    const expected = [
      ['Home', '/index'], ['Learn', '/study'], ['Practice', '/quiz'],
      ['Library', '/library'], ['You', '/you'],
    ];
    for (const [label, route] of expected) {
      expect(buttons.some((b) => b.props['aria-label'] === label && b.props['data-route'] === route)).toBe(true);
      expect(fs.existsSync(path.join(APP_TABS_DIR, `${route.slice(1)}.tsx`))).toBe(true);
    }
    expect((LAYOUT_SOURCE.match(/tabBarIcon/g) ?? []).length).toBe(5);
  });

  it('keeps Progress and Profile reachable as hidden deep links after the merge', () => {
    for (const route of ['progress', 'profile']) {
      expect(fs.existsSync(path.join(APP_TABS_DIR, `${route}.tsx`))).toBe(true);
      expect(LAYOUT_SOURCE).toMatch(new RegExp(`name="${route}"[^>]*href: null`, 's'));
    }
  });

  it('accounts for every route file in (tabs) — no phantom auto-registered tab', () => {
    // expo-router silently adds an undeclared route file as a tab. A tab bar
    // that is six wide in production while the gate asserts five is exactly
    // the false green this assertion exists to prevent.
    const declared = [...LAYOUT_SOURCE.matchAll(/<Tabs\.Screen\s+name="([^"]+)"/g)].map((m) => m[1]).sort();
    const files = fs
      .readdirSync(APP_TABS_DIR)
      .filter((f) => f.endsWith('.tsx') && f !== '_layout.tsx')
      .map((f) => f.replace(/\.tsx$/, ''))
      .sort();
    expect(declared).toEqual(files);
  });

  it('focus follows arrow keys, Home/End and Enter activates the focused route', async () => {
    const tree = await mountLayout();
    let buttons = tree.root.findAllByProps({ role: 'tab' });

    act(() => buttons[0].props.onFocus());
    buttons = tree.root.findAllByProps({ role: 'tab' });
    act(() => buttons[0].props.onKeyDown({ key: 'ArrowRight' }));
    buttons = tree.root.findAllByProps({ role: 'tab' });
    expect(buttons[1].props['data-focused']).toBe('true');
    act(() => buttons[1].props.onKeyDown({ key: 'Enter' }));
    expect(push).toHaveBeenCalledWith('/study');

    act(() => buttons[1].props.onKeyDown({ key: 'ArrowLeft' }));
    buttons = tree.root.findAllByProps({ role: 'tab' });
    expect(buttons[0].props['data-focused']).toBe('true');
    act(() => buttons[0].props.onKeyDown({ key: 'End' }));
    buttons = tree.root.findAllByProps({ role: 'tab' });
    expect(buttons[4].props['data-focused']).toBe('true');
    act(() => buttons[0].props.onKeyDown({ key: 'Home' }));
    buttons = tree.root.findAllByProps({ role: 'tab' });
    expect(buttons[0].props['data-focused']).toBe('true');
  });

  it('selected state tracks the current pathname (active tab is never ambiguous)', async () => {
    setPath('/quiz');
    const tree = await mountLayout();
    const buttons = tree.root.findAllByProps({ role: 'tab' });
    const selected = buttons.filter((b) => b.props['aria-selected'] === true);
    expect(selected).toHaveLength(1);
    expect(selected[0].props['data-route']).toBe('/quiz');
    expect(selected[0].props.tabIndex).toBe(0);
    expect(buttons.filter((b) => b.props.tabIndex === 0)).toHaveLength(1);
  });

  it('keeps the responsive wide-screen branch from the real layout source', () => {
    expect(LAYOUT_SOURCE).toContain('useWindowDimensions');
    expect(LAYOUT_SOURCE).toContain('width >= 768');
  });
});
