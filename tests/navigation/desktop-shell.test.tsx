/**
 * G-15 — the real tab layout at desktop and phone viewports.
 *
 * The production module under test is `app/(tabs)/_layout.tsx`. Expo Router's
 * <Tabs> is replaced with a recorder so the styles the real layout supplies
 * can be asserted; the responsive decisions themselves are production code.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

type ScreenLayout = (props: { children: React.ReactNode }) => React.ReactElement<{
  props: { style?: Record<string, unknown> };
}>;

const state = vi.hoisted(() => ({
  width: 1280,
  screenLayout: undefined as ScreenLayout | undefined,
  tabBar: undefined as Record<string, unknown> | undefined,
}));

// Read the style the REAL layout returned, not a mock's copy of it.
function sceneStyle(): Record<string, unknown> {
  if (!state.screenLayout) throw new Error('layout did not supply screenLayout');
  const wrapper = state.screenLayout({ children: null });
  return (wrapper.props as { style?: Record<string, unknown> }).style ?? {};
}

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useWindowDimensions: () => ({ width: state.width, height: 800, scale: 1, fontScale: 1 }),
  };
});

vi.mock('expo-router', () => {
  const Tabs = ({
    children,
    screenLayout,
    screenOptions,
  }: {
    children: React.ReactNode;
    screenLayout?: ScreenLayout;
    screenOptions?: { tabBarStyle?: Record<string, unknown> };
  }) => {
    state.screenLayout = screenLayout;
    state.tabBar = screenOptions?.tabBarStyle;
    return React.createElement('TabHost', { 'data-testid': 'tabhost' }, children);
  };
  Tabs.Screen = () => null;
  return { Tabs };
});

vi.mock('../../store/settingsStore', () => ({ useSettingsStore: () => ({ theme: 'light' }) }));
vi.mock('../../components/SyncIndicator', () => ({ SyncIndicator: () => null }));
vi.mock('../../lib/supabase', () => ({ isSupabaseAvailable: () => true }));

import TabLayout from '../../app/(tabs)/_layout';
import { LAYOUT } from '../../src/design/tokens';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let tree: TestRenderer.ReactTestRenderer | undefined;

async function mountAt(width: number): Promise<void> {
  state.width = width;
  state.screenLayout = undefined;
  state.tabBar = undefined;
  await act(async () => {
    tree = TestRenderer.create(React.createElement(TabLayout));
  });
}

afterEach(() => {
  tree?.unmount();
  tree = undefined;
});

describe('responsive tab shell', () => {
  it('centres a capped content column beside the rail at 1280 px', async () => {
    await mountAt(1280);

    expect(state.tabBar?.width).toBe(LAYOUT.railWidth);
    expect(state.tabBar?.borderRightWidth).toBe(1);
    const style = sceneStyle();
    expect(style.flex).toBe(1);
    const left = style.paddingLeft as number;
    const right = style.paddingRight as number;
    expect(left).toBe(140); // 80px rail + 60px centred gutter
    expect(right).toBe(60);
    expect(1280 - left - right).toBe(LAYOUT.contentMaxWidth);
  });

  it('keeps the fixed gutter at the desktop breakpoint without overflowing', async () => {
    await mountAt(1024);

    const style = sceneStyle();
    expect(style.paddingLeft).toBe(LAYOUT.railWidth + LAYOUT.gutter);
    expect(style.paddingRight).toBe(LAYOUT.gutter);
    expect(1024 - (style.paddingLeft as number) - (style.paddingRight as number))
      .toBeLessThanOrEqual(LAYOUT.contentMaxWidth);
  });

  it('has no regression at 390 px: bottom bar, no side rail, no forced width', async () => {
    await mountAt(390);

    expect(state.screenLayout).toBeUndefined();
    expect(state.tabBar?.height).toBe(72);
    expect(state.tabBar?.width).toBeUndefined();
  });
});
