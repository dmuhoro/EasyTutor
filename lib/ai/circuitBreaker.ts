/**
 * Provider circuit breaker.
 *
 * When a provider fails repeatedly we stop calling it for a cooling-off
 * window instead of paying the full timeout on every learner action. After the
 * window a single half-open probe decides: success closes the circuit, failure
 * re-opens it.
 *
 * This is deliberately process-local state: it protects the user from a dead
 * provider, not the provider from us (the edge function owns rate limiting).
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  /** Consecutive failures that open the circuit. Default 3. */
  failureThreshold?: number;
  /** How long to stay open before allowing a probe. Default 60s. */
  cooldownMs?: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

export interface CircuitSnapshot {
  name: string;
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
  retryAt: number | null;
}

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private failures = 0;
  private openedAt: number | null = null;
  private probing = false;

  constructor(readonly name: string, options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 60_000;
    // Read the clock on each check so a test can advance Date.now after the
    // process-local breakers were created.
    this.now = options.now ?? (() => Date.now());
  }

  get state(): CircuitState {
    if (this.openedAt === null) return 'closed';
    if (this.now() - this.openedAt < this.cooldownMs) return 'open';
    return 'half_open';
  }

  /**
   * True when the provider may be called now. In the half-open state exactly
   * one probe is admitted; concurrent callers wait for its result.
   */
  canAttempt(): boolean {
    const state = this.state;
    if (state === 'closed') return true;
    if (state === 'open') return false;
    if (this.probing) return false;
    this.probing = true;
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = null;
    this.probing = false;
  }

  recordFailure(): void {
    this.probing = false;
    this.failures += 1;
    if (this.openedAt !== null || this.failures >= this.failureThreshold) {
      this.openedAt = this.now();
    }
  }

  reset(): void {
    this.failures = 0;
    this.openedAt = null;
    this.probing = false;
  }

  snapshot(): CircuitSnapshot {
    const state = this.state;
    return {
      name: this.name,
      state,
      consecutiveFailures: this.failures,
      openedAt: this.openedAt,
      retryAt: this.openedAt === null ? null : this.openedAt + this.cooldownMs,
    };
  }
}

/** One breaker per model rail. Alias rails were removed with the direct clients. */
export const aiCircuitBreakers = {
  hosted_proxy: new CircuitBreaker('hosted_proxy'),
  local_ollama: new CircuitBreaker('local_ollama'),
};

export type BreakerKey = keyof typeof aiCircuitBreakers;

export const breakerFor = (provider: BreakerKey): CircuitBreaker => aiCircuitBreakers[provider];

/** Test/debug helper: force every breaker closed. */
export const resetAICircuitBreakers = (): void => {
  for (const breaker of Object.values(aiCircuitBreakers)) breaker.reset();
};
