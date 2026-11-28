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
/**
 * Upper bound for first paint while auth/profile requests are still pending.
 * The layout arms this once and reports the timeout explicitly; the shell must
 * never stay on the skeleton because a network request never settled.
 */
export const BOOT_LOADING_TIMEOUT_MS = 5000;

export interface BootInputs {
  /** True while the Supabase session is still being restored. */
  authLoading: boolean;
  /** True while the profile row is being fetched or re-synced. */
  profileLoading: boolean;
  /** True once fonts resolved, failed, or the grace window elapsed. */
  fontsSettled: boolean;
  /**
   * True once the first-paint deadline elapsed while auth or profile was still
   * pending. Optional so existing callers keep the original strict behaviour.
   */
  loadingDeadlineExpired?: boolean;
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
  const loadingSettled =
    (!inputs.authLoading && !inputs.profileLoading) || Boolean(inputs.loadingDeadlineExpired);
  const isBootReady = loadingSettled && inputs.fontsSettled;
  const shouldLatch = isBootReady && !hasBootstrapped;

  return {
    isBootReady,
    isAppReady: isBootReady || hasBootstrapped,
    shouldLatch,
  };
}
