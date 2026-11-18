/**
 * First-paint readiness.
 *
 * `isBootReady` says whether every boot input has settled *right now*.
 * `isAppReady` is the value the app actually renders against, and it is
 * **latched**: once the shell has rendered, a later auth/profile refresh can
 * never flip it back off.
 *
 * Why the latch is not optional: the root layout renders a skeleton instead of
 * the <Stack> when the app is not ready. Swapping the stack back out unmounts
 * expo-router, which then re-derives the URL from the route tree (dropping the
 * user's back-stack). A profile refresh that re-armed the gate therefore put the
 * app into a permanent mount/unmount loop at every auth event.
 */
export interface BootInputs {
  /** True while the Supabase session is still being restored. */
  authLoading: boolean;
  /** True while the profile row is being fetched or re-synced. */
  profileLoading: boolean;
  /** True once fonts resolved, failed, or the grace window elapsed. */
  fontsSettled: boolean;
}

export interface BootState {
  /** Every input has settled right now. */
  isBootReady: boolean;
  /** What the layout renders against — latched after the first settle. */
  isAppReady: boolean;
  /** Whether this pass must latch the gate on. */
  shouldLatch: boolean;
}

export function resolveBootState(
  inputs: BootInputs,
  hasBootstrapped: boolean,
): BootState {
  const isBootReady = !inputs.authLoading && !inputs.profileLoading && inputs.fontsSettled;
  const shouldLatch = isBootReady && !hasBootstrapped;

  return {
    isBootReady,
    isAppReady: isBootReady || hasBootstrapped,
    shouldLatch,
  };
}
