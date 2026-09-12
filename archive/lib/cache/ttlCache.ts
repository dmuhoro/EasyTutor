/**
 * A memory-safe, TTL-aware cache with LRU eviction policy.
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxItems: number;
  private defaultTTL: number;

  constructor(maxItems = 100, defaultTTL = 1000 * 60 * 60) { // 1 hour default
    this.maxItems = maxItems;
    this.defaultTTL = defaultTTL;
  }

  public set(key: string, value: T, ttl = this.defaultTTL): void {
    // LRU eviction: if full, remove the first (oldest) entry
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  public get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU position by re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}
