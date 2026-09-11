import { AI_PROVIDER, getAIProvider } from '../aiProvider';
import { checkLocalAIHealth } from './healthcheck';

/**
 * Determines the final AI routing strategy based on capability and health.
 */
export const resolveAIRouting = async () => {
  const preferred = getAIProvider();

  if (preferred === AI_PROVIDER.OFFLINE) {
    const health = await checkLocalAIHealth();
    if (!health.online) {
      console.warn('[BRIDGE] Local AI unreachable. Falling back to ONLINE mode.');
      return AI_PROVIDER.ONLINE;
    }
  }

  return preferred;
};
