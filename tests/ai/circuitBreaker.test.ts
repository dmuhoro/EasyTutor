import { describe, expect, it } from 'vitest';
import { CircuitBreaker } from '../../lib/ai/circuitBreaker';

function makeBreaker(threshold = 3, cooldownMs = 1_000) {
  let clock = 0;
  const breaker = new CircuitBreaker('test', {
    failureThreshold: threshold,
    cooldownMs,
    now: () => clock,
  });
  return {
    breaker,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe('circuit breaker', () => {
  it('stays closed while calls succeed', () => {
    const { breaker } = makeBreaker();
    for (let i = 0; i < 10; i++) {
      expect(breaker.canAttempt()).toBe(true);
      breaker.recordSuccess();
    }
    expect(breaker.state).toBe('closed');
  });

  it('opens after the configured number of consecutive failures', () => {
    const { breaker } = makeBreaker(3);
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('closed');
    breaker.recordFailure();
    expect(breaker.state).toBe('open');
    expect(breaker.canAttempt()).toBe(false);
  });

  it('resets the failure count on success', () => {
    const { breaker } = makeBreaker(3);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('closed');
  });

  it('admits one half-open probe after the cooldown, and closes on success', () => {
    const { breaker, advance } = makeBreaker(2, 1_000);
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canAttempt()).toBe(false);

    advance(1_000);
    expect(breaker.state).toBe('half_open');
    expect(breaker.canAttempt()).toBe(true);
    // A second concurrent caller must not also probe.
    expect(breaker.canAttempt()).toBe(false);

    breaker.recordSuccess();
    expect(breaker.state).toBe('closed');
    expect(breaker.canAttempt()).toBe(true);
  });

  it('re-opens when the half-open probe fails', () => {
    const { breaker, advance } = makeBreaker(2, 1_000);
    breaker.recordFailure();
    breaker.recordFailure();
    advance(1_000);
    expect(breaker.canAttempt()).toBe(true);
    breaker.recordFailure();
    expect(breaker.state).toBe('open');
    expect(breaker.canAttempt()).toBe(false);
  });

  it('snapshot reports the retry time', () => {
    const { breaker } = makeBreaker(1, 500);
    breaker.recordFailure();
    const snapshot = breaker.snapshot();
    expect(snapshot.state).toBe('open');
    expect(snapshot.retryAt).toBe(500);
    expect(snapshot.consecutiveFailures).toBe(1);
  });
});
