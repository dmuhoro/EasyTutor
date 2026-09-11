export class IntermittentConnectivityHandler {
  async withRetry<T>(operation: () => Promise<T>, retries = 2, timeoutMs = 5_000): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await this.withTimeout(operation(), timeoutMs);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  }
}
