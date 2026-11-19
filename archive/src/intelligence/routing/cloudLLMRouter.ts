import { generateCloudResponse } from '../../../lib/cloud';
import { deduplicateRequest, retryAsync, withTimeout } from '../../../lib/network';
import { SYSTEM_CONFIG } from '../../config/registry';
import { RuntimeContext } from '../runtime/runtimeContext';
import { LLMRequest, LLMResponse } from './localLLMRouter';

const estimateTokens = (value: string): number => Math.ceil(value.length / 4);

export class CloudLLMRouter {
  async execute(request: LLMRequest, _context: RuntimeContext): Promise<LLMResponse> {
    const text = await deduplicateRequest(`cloud_${request.cacheKey}`, async () => retryAsync(
      async () => withTimeout(
        generateCloudResponse(request.prompt),
        SYSTEM_CONFIG.AI.DEFAULT_TIMEOUT_MS,
        '[AI TIMEOUT] Cloud LLM execution took too long',
      ),
      SYSTEM_CONFIG.AI.RETRY_ATTEMPTS,
    ));

    return {
      text,
      route: 'cloud',
      confidence: text.length > 0 ? 0.86 : 0.25,
      tokenUsage: {
        prompt: estimateTokens(request.prompt),
        completion: estimateTokens(text),
      },
    };
  }
}
