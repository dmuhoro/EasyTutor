/**
 * Schedule non-critical work outside the browser's first-interaction window.
 *
 * Lighthouse TBT measures long tasks that run before the page becomes
 * interactive. Startup work that is not required for first paint, auth gating
 * or navigation must therefore run when the browser is idle, not on a short
 * timer. `requestIdleCallback` is used where available; browsers without it get
 * a bounded fallback so the work still runs exactly once.
 */

export const IDLE_TASK_TIMEOUT_MS = 2000;

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallbackHandle = number;

type IdleCapableGlobal = typeof globalThis & {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadlineLike) => void,
    options?: { timeout?: number },
  ) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

/**
 * Schedule `task` for a browser idle period.
 *
 * Returns a cleanup function that cancels the pending task when possible.
 * The task is never run more than once for a single schedule call.
 */
export function scheduleIdleTask(
  task: () => void,
  fallbackDelayMs: number = IDLE_TASK_TIMEOUT_MS,
): () => void {
  const scope = globalThis as IdleCapableGlobal;

  if (typeof scope.requestIdleCallback === 'function') {
    const handle = scope.requestIdleCallback(() => task(), { timeout: fallbackDelayMs });
    return () => scope.cancelIdleCallback?.(handle);
  }

  const handle = setTimeout(task, fallbackDelayMs);
  return () => clearTimeout(handle);
}
