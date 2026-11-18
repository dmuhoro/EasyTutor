import { beforeAll } from 'vitest';
import { getLearningPort } from '../../store/learningGateway';

/**
 * W1-4/T4 — load the lazy persistence graph before the timed test body.
 *
 * `getLearningPort()` imports `services/learningPort` (→ `src/intelligence`)
 * on first use. Under CPU contention its one-time Vitest transform was measured
 * at ~5s inside a flow test's 5s budget, producing intermittent false timeouts
 * (failing runs: 44.77s total transform vs 19-35s on green runs; the same tests
 * pass in 3.81s in isolation).
 *
 * Warming it in `beforeAll` (default 10s hook budget) keeps the real module and
 * the real submission path: `addQuizScore` still calls `getLearningPort()` and
 * `port.recordQuizScore()`. The 5s per-test timeout is NOT raised and no
 * assertion is weakened — the one-time module transform simply moves out of
 * the measured region. Test tooling only; no production module is changed.
 */
export const warmLearningPort = (): void => {
  beforeAll(async () => {
    await getLearningPort();
  });
};
