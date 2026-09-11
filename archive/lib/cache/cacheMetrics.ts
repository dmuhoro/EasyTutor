import { useMetricsStore } from '../../observability/metrics';

export const trackCacheHit = (name: string) => {
  useMetricsStore.getState().recordMetric('CACHE_HIT', 1, { cacheName: name });
};

export const trackCacheMiss = (name: string) => {
  useMetricsStore.getState().recordMetric('CACHE_MISS', 1, { cacheName: name });
};
