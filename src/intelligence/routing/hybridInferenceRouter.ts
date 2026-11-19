import { getMemoryCachedResponse, setMemoryCachedResponse } from '../../../lib/cache';
import { Telemetry } from '../../observability/telemetry';
import { RuntimeContext } from '../runtime/runtimeContext';
import { executeWithReliability } from '../../../lib/ai/reliability';
import { resolveProviderSelection } from '../../../lib/ai/providerResolver';
import type { ProviderSelection, ModelProvider } from '../../../lib/ai/providerSelection';
import { HybridRuntime } from '../../runtime/hybridRuntime';
import { RuntimeRequest } from '../../runtime/types';

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  complexity: 'low' | 'normal' | 'high';
  cacheKey: string;
}

export interface LLMResponse {
  text: string;
  route: 'cache' | 'local' | 'cloud' | 'offline_fallback';
  /** Model rail that actually answered, or the offline decision when none did. */
  provider?: ModelProvider;
  confidence: number;
  tokenUsage: {
    prompt: number;
    completion: number;
  };
}

export interface HybridRouteDecision {
  route: LLMResponse['route'];
  reason: string;
}

const estimateTokens = (value: string): number => Math.ceil((value || '').length / 4);

/**
 * One decision for the governed orchestration path. It consumes the result of
 * `selectProvider` instead of maintaining a second local/cloud preference list.
 */
export class HybridInferenceRouter {
  constructor(
    private readonly select: (options?: {
      online?: boolean;
    }) => Promise<ProviderSelection> = resolveProviderSelection,
  ) {}

  decide(selection: ProviderSelection, cacheHit = false): HybridRouteDecision {
    if (cacheHit) return { route: 'cache', reason: 'semantic-cache-hit' };
    if (selection.provider === 'hosted_proxy') {
      return { route: 'cloud', reason: selection.reason };
    }
    if (selection.provider === 'local_ollama') {
      return { route: 'local', reason: selection.reason };
    }
    return { route: 'offline_fallback', reason: selection.reason };
  }

  async execute(request: LLMRequest, context: RuntimeContext): Promise<LLMResponse> {
    const start = Date.now();
    const selection = await this.select({
      online: context.connectivity_state !== 'offline',
    });
    const cached = context.cache_policy.mode !== 'bypass'
      ? getMemoryCachedResponse(request.cacheKey) as string | null
      : null;
    const decision = this.decide(selection, Boolean(cached));

    // Governance and telemetry continuity: every inference still passes through
    // HybridRuntime. Its stub content is never used as an AI answer.
    const runtimeRequest: RuntimeRequest = {
      portal_type: context.portal_type,
      canonical_id: context.canonical_id,
      operation: 'inference',
      payload: {
        prompt: request.prompt,
        cacheKey: request.cacheKey,
        complexity: request.complexity,
        provider: selection.provider,
      },
      constraints: {},
    };
    await HybridRuntime.getInstance().execute(runtimeRequest);

    if (cached) {
      Telemetry.emit({
        event: 'CACHE_HIT',
        source: 'intelligence',
        canonicalId: context.canonical_id,
        userId: context.user_id,
        portalType: context.portal_type,
        latency: Date.now() - start,
        operationType: 'AI_CACHE_LOOKUP',
        payload: { route_reason: decision.reason },
      });

      const llmRes: LLMResponse = {
        text: cached,
        route: 'cache',
        provider: selection.provider,
        confidence: 0.95,
        tokenUsage: { prompt: estimateTokens(request.prompt), completion: estimateTokens(cached) },
      };

      Telemetry.emit({
        event: 'AI_ROUTED',
        source: 'intelligence',
        canonicalId: context.canonical_id,
        userId: context.user_id,
        portalType: context.portal_type,
        latency: Date.now() - start,
        operationType: 'AI_ROUTING',
        payload: {
          route: llmRes.route,
          provider: selection.provider,
          decision: decision.reason,
          confidence: llmRes.confidence,
          prompt_tokens: llmRes.tokenUsage.prompt,
          completion_tokens: llmRes.tokenUsage.completion,
        },
      });
      return llmRes;
    }

    let text = '';
    let answerProvider: ModelProvider = selection.provider;
    if (selection.provider !== 'offline') {
      const result = await executeWithReliability<string>(
        request.systemPrompt ?? '',
        [{ role: 'user', content: request.prompt }],
        {
          provider: selection.provider,
          timeoutMs: 12_000,
          retries: 1,
          fallbackPlaceholder: '',
          context: {
            feature: 'other',
            userId: context.user_id,
            metadata: { canonicalId: context.canonical_id, kind: request.cacheKey },
          },
        },
      );
      text = result.data ?? '';
      answerProvider = result.provider === 'hosted_proxy' || result.provider === 'local_ollama'
        ? result.provider
        : selection.provider;
    }

    const route: LLMResponse['route'] = answerProvider === 'hosted_proxy'
      ? 'cloud'
      : answerProvider === 'local_ollama'
        ? 'local'
        : 'offline_fallback';

    const llmResponse: LLMResponse = {
      text,
      route,
      provider: answerProvider,
      confidence: text ? (route === 'offline_fallback' ? 0.2 : 0.75) : 0.2,
      tokenUsage: {
        prompt: estimateTokens(request.prompt),
        completion: estimateTokens(text),
      },
    };

    if (llmResponse.text) setMemoryCachedResponse(request.cacheKey, llmResponse.text);

    Telemetry.emit({
      event: route === 'offline_fallback' ? 'OFFLINE_FALLBACK' : 'AI_ROUTED',
      source: 'intelligence',
      canonicalId: context.canonical_id,
      userId: context.user_id,
      portalType: context.portal_type,
      latency: Date.now() - start,
      operationType: 'AI_ROUTING',
      payload: {
        route,
        provider: answerProvider,
        decision: decision.reason,
        confidence: llmResponse.confidence,
        prompt_tokens: llmResponse.tokenUsage.prompt,
        completion_tokens: llmResponse.tokenUsage.completion,
      },
    });

    return llmResponse;
  }
}
