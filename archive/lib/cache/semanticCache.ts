import { TTLCache } from './ttlCache';

/**
 * Normalizes a prompt to create a deterministic cache key.
 */
export const normalizePrompt = (prompt: string): string => {
  return prompt
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/[^\w\s]/g, ''); // Remove punctuation
};

export class SemanticCache<T> {
  private cache: TTLCache<T>;

  constructor(maxItems = 50, ttl = 1000 * 60 * 60 * 24) { // 24 hours
    this.cache = new TTLCache<T>(maxItems, ttl);
  }

  public get(prompt: string): T | null {
    const key = normalizePrompt(prompt);
    return this.cache.get(key);
  }

  public set(prompt: string, value: T): void {
    const key = normalizePrompt(prompt);
    this.cache.set(key, value);
  }

  public clear(): void {
    this.cache.clear();
  }
}

// Global instances for different domains
export const explanationCache = new SemanticCache<string>(50);
export const quizCache = new SemanticCache<any[]>(50);
export const retrievalCache = new SemanticCache<any[]>(100, 1000 * 60 * 30); // 30 mins
