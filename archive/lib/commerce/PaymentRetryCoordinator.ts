import { Transaction, PaymentRequest } from '../../types/commerce';

export class PaymentRetryCoordinator {
  private static MAX_RETRIES = 3;
  private static RETRY_DELAY_MS = 5000;

  /**
   * Determines if a transaction should be retried based on the failure reason and retry count.
   */
  static shouldRetry(transaction: Transaction, retryCount: number): boolean {
    if (retryCount >= this.MAX_RETRIES) return false;

    // Retry on specific failure types like timeouts or network issues
    const retryableStatuses = ['FAILED', 'EXPIRED'];
    if (!retryableStatuses.includes(transaction.status)) return false;

    // Some specific error messages or codes from providers could also trigger retries
    // return transaction.metadata?.error_code === 'TIMEOUT';
    
    return true;
  }

  /**
   * Executes a retry delay.
   */
  static async waitBeforeRetry(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
  }
}
