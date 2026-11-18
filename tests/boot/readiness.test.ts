import { describe, it, expect } from 'vitest';

import { resolveBootState, type BootInputs } from '../../lib/boot';

// ── First-paint readiness gate ───────────────────────────────────────────────
// Regression: `isAppReady` used to be derived straight from the live loading
// flags. Every auth event (including routine TOKEN_REFRESHED) re-armed
// `isProfileLoading`, which swapped the root <Stack> out for the skeleton,
// unmounted expo-router, and let the router re-derive the URL from the route
// tree — an endless mount/unmount loop that also dropped the back-stack.
// Once the shell has painted, readiness must stay on.

const settled: BootInputs = {
  authLoading: false,
  profileLoading: false,
  fontsSettled: true,
};

describe('resolveBootState', () => {
  it('holds the skeleton until every boot input settles', () => {
    const state = resolveBootState({ ...settled, profileLoading: true }, false);
    expect(state.isBootReady).toBe(false);
    expect(state.isAppReady).toBe(false);
    expect(state.shouldLatch).toBe(false);
  });

  it('holds the skeleton while fonts are still pending', () => {
    const state = resolveBootState({ ...settled, fontsSettled: false }, false);
    expect(state.isAppReady).toBe(false);
  });

  it('reports ready and latches once, on the first settle', () => {
    const first = resolveBootState(settled, false);
    expect(first.isBootReady).toBe(true);
    expect(first.isAppReady).toBe(true);
    expect(first.shouldLatch).toBe(true);

    const second = resolveBootState(settled, true);
    expect(second.shouldLatch).toBe(false);
  });

  it('stays ready when a later profile refresh re-arms the loading flag', () => {
    // This is the exact regression: an auth event flips profileLoading back on.
    const afterRefresh = resolveBootState({ ...settled, profileLoading: true }, true);
    expect(afterRefresh.isBootReady).toBe(false);
    expect(afterRefresh.isAppReady).toBe(true);
    expect(afterRefresh.shouldLatch).toBe(false);
  });

  it('stays ready through a transient auth reload after bootstrap', () => {
    const state = resolveBootState({ ...settled, authLoading: true }, true);
    expect(state.isAppReady).toBe(true);
  });

  it('never un-readies a bootstrapped app, for any input combination', () => {
    for (const authLoading of [false, true]) {
      for (const profileLoading of [false, true]) {
        for (const fontsSettled of [false, true]) {
          const state = resolveBootState({ authLoading, profileLoading, fontsSettled }, true);
          expect(state.isAppReady).toBe(true);
        }
      }
    }
  });
});
