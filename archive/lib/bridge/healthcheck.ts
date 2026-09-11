import { getLocalAIEndpoint } from './localNetwork';

export interface HealthStatus {
  online: boolean;
  latency: number;
  error?: string;
}

/**
 * Rapidly verifies if the local AI service (Ollama) is reachable.
 */
export const checkLocalAIHealth = async (timeout = 2000): Promise<HealthStatus> => {
  const endpoint = getLocalAIEndpoint();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${endpoint}/api/tags`, {
      signal: controller.signal,
    });

    clearTimeout(id);

    return {
      online: response.ok,
      latency: Date.now() - startTime,
    };
  } catch (err) {
    return {
      online: false,
      latency: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'Unreachable',
    };
  }
};
