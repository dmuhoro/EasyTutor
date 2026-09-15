export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackMessage: string = 'Request timed out'
): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(fallbackMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
};

export const retryAsync = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`[NETWORK] Retry attempt ${attempt}/${retries} after ${delay}ms`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Max retries reached');
};

const inFlightRequests = new Map<string, Promise<any>>();

export const deduplicateRequest = <T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> => {
  if (inFlightRequests.has(key)) {
    console.log(`[NETWORK] Deduplicating request: ${key}`);
    return inFlightRequests.get(key) as Promise<T>;
  }

  const promise = fn().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
};
