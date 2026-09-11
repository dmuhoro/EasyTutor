/**
 * PAYMENT RETRY COORDINATOR
 *
 * Implements exponential backoff and intelligent retry logic for failed transactions:
 * - Exponential backoff strategy
 * - Provider failover
 * - Circuit breaker pattern
 * - Maximum retry limits
 */

import { Transaction, PaymentStatus } from './paymentContracts';

export interface RetryPolicy {
  max_retries: number;
  initial_backoff_ms: number;
  max_backoff_ms: number;
  backoff_multiplier: number;
  jitter_factor: number;
}

export interface RetryAttempt {
  attempt_number: number;
  transaction_id: string;
  provider: string;
  status: PaymentStatus;
  error?: string;
  next_retry_at?: string;
  timestamp: string;
}

export class PaymentRetryCoordinator {
  private retryAttempts: Map<string, RetryAttempt[]> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailTime: string; isOpen: boolean }> =
    new Map();

  private defaultPolicy: RetryPolicy = {
    max_retries: 5,
    initial_backoff_ms: 1000,
    max_backoff_ms: 60000,
    backoff_multiplier: 2,
    jitter_factor: 0.1,
  };

  async scheduleRetry(transaction: Transaction, policy?: RetryPolicy): Promise<RetryAttempt> {
    const txPolicy = policy || this.defaultPolicy;
    const attempts = this.retryAttempts.get(transaction.transaction_id) || [];
    const attemptNumber = attempts.length + 1;

    if (attemptNumber > txPolicy.max_retries) {
      throw new Error(`Max retries (${txPolicy.max_retries}) exceeded for transaction ${transaction.transaction_id}`);
    }

    // Check circuit breaker
    const breaker = this.circuitBreakers.get(transaction.provider);
    if (breaker?.isOpen && this.isCircuitStillOpen(breaker)) {
      throw new Error(`Circuit breaker open for provider ${transaction.provider}`);
    }

    const backoffMs = this.calculateBackoff(attemptNumber, txPolicy);
    const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

    const attempt: RetryAttempt = {
      attempt_number: attemptNumber,
      transaction_id: transaction.transaction_id,
      provider: transaction.provider,
      status: 'pending',
      next_retry_at: nextRetryAt,
      timestamp: new Date().toISOString(),
    };

    attempts.push(attempt);
    this.retryAttempts.set(transaction.transaction_id, attempts);

    return attempt;
  }

  async recordRetryResult(
    transaction_id: string,
    success: boolean,
    error?: string,
    provider?: string
  ): Promise<void> {
    const attempts = this.retryAttempts.get(transaction_id);
    if (!attempts || attempts.length === 0) return;

    const lastAttempt = attempts[attempts.length - 1];
    lastAttempt.status = success ? 'completed' : 'failed';
    if (error) lastAttempt.error = error;

    if (!success && provider) {
      this.recordProviderFailure(provider);
    } else if (success && provider) {
      this.recordProviderSuccess(provider);
    }
  }

  private calculateBackoff(attemptNumber: number, policy: RetryPolicy): number {
    const exponentialBackoff = policy.initial_backoff_ms * Math.pow(policy.backoff_multiplier, attemptNumber - 1);
    const cappedBackoff = Math.min(exponentialBackoff, policy.max_backoff_ms);
    const jitter = cappedBackoff * policy.jitter_factor * Math.random();
    return cappedBackoff + jitter;
  }

  private recordProviderFailure(provider: string): void {
    const breaker = this.circuitBreakers.get(provider) || { failures: 0, lastFailTime: '', isOpen: false };
    breaker.failures++;
    breaker.lastFailTime = new Date().toISOString();

    if (breaker.failures > 5) {
      breaker.isOpen = true;
    }

    this.circuitBreakers.set(provider, breaker);
  }

  private recordProviderSuccess(provider: string): void {
    const breaker = this.circuitBreakers.get(provider);
    if (breaker) {
      breaker.failures = 0;
      breaker.isOpen = false;
    }
  }

  private isCircuitStillOpen(breaker: { failures: number; lastFailTime: string; isOpen: boolean }): boolean {
    const openDuration = Date.now() - new Date(breaker.lastFailTime).getTime();
    const halfOpenThreshold = 60000; // 1 minute

    if (openDuration > halfOpenThreshold) {
      breaker.isOpen = false;
      return false;
    }

    return true;
  }

  getRetryHistory(transaction_id: string): RetryAttempt[] {
    return this.retryAttempts.get(transaction_id) || [];
  }

  getCircuitBreakerStatus(provider: string): { isOpen: boolean; failures: number } | undefined {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return undefined;
    return { isOpen: breaker.isOpen, failures: breaker.failures };
  }
}
