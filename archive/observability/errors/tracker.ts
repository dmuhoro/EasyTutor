import { useMetricsStore } from '../metrics';

export interface ErrorEvent {
  message: string;
  code?: string;
  context?: any;
  timestamp: string;
}

export const recordError = (
  category: string,
  error: unknown,
  context?: any
): void => {
  const message = error instanceof Error ? error.message : String(error);
  
  console.error(`[ERROR:${category}] ${message}`, context);

  useMetricsStore.getState().recordMetric('ERROR_OCCURRENCE', 1, {
    category,
    message: message.substring(0, 50), // Truncate for metric tags
  });
};
