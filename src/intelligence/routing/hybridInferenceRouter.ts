import { getMemoryCachedResponse, setMemoryCachedResponse } from '../../../lib/cache';
import { Telemetry } from '../../observability/telemetry';
import { RuntimeContext } from '../runtime/runtimeContext';
import { CloudLLMRouter } from './cloudLLMRouter';
import { LLMRequest, LLMResponse, LocalLLMRouter } from './localLLMRouter';
import { HybridRuntime } from '../../runtime/hybridRuntime';
import { RuntimeRequest } from '../../runtime/types';

export interface HybridRouteDecision {
  route: LLMResponse['route'] | 'escalate';
  reason: string;
}

export class HybridInferenceRouter {
  constructor(
    private readonly localRouter = new LocalLLMRouter(),
    private readonly cloudRouter = new CloudLLMRouter(),
  ) {}

  decide(request: LLMRequest, context: RuntimeContext): HybridRouteDecision {
    if (context.cache_policy.mode !== 'bypass' && getMemoryCachedResponse(request.cacheKey)) {
      return { route: 'cache', reason: 'semantic-cache-hit' };
    }
    if (context.connectivity_state === 'offline') {
      return { route: 'local', reason: 'offline-local-only' };
    }
    if (context.ai_execution_mode === 'local') {
      return { route: 'local', reason: 'runtime-forced-local' };
    }
    if (context.ai_execution_mode === 'cloud') {
      return { route: 'cloud', reason: 'runtime-forced-cloud' };
    }
    if (request.complexity === 'high' || context.mastery_state.score >= 70) {
      return { route: 'cloud', reason: 'high-complexity-or-advanced-mastery' };
    }

    return { route: 'local', reason: 'low-latency-default' };
  }

  async execute(request: LLMRequest, context: RuntimeContext): Promise<LLMResponse> {
    const start = Date.now();

    // If a cache hit is present, still route through HybridRuntime but provide cached shortcut
    const cached = context.cache_policy.mode !== 'bypass' ? getMemoryCachedResponse(request.cacheKey) as string | null : null;

    if (cached) {
      Telemetry.emit({
        event: 'CACHE_HIT',
        source: 'intelligence',
        canonicalId: context.canonical_id,
        userId: context.user_id,
        portalType: context.portal_type,
        latency: Date.now() - start,
        operationType: 'AI_CACHE_LOOKUP',
        payload: { route_reason: 'semantic-cache-hit' },
      });
      // Still record via HybridRuntime for governance/telemetry continuity
      const runtimeReq: RuntimeRequest = {
        portal_type: context.portal_type,
        canonical_id: context.canonical_id,
        operation: 'inference',
        payload: { cached, cacheKey: request.cacheKey, prompt: request.prompt, complexity: request.complexity },
      };

      try {
        const runtimeRes = await HybridRuntime.getInstance().execute(runtimeReq);
        // Map runtime result to LLMResponse shape
        const text = cached;
        const estimateTokens = (v: string) => Math.ceil(v.length / 4);

        const llmRes: LLMResponse = {
          text,
          route: 'cache',
          confidence: 0.95,
          tokenUsage: { prompt: estimateTokens(request.prompt), completion: estimateTokens(text) },
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
            route: 'cache',
            decision: 'semantic-cache-hit',
            confidence: llmRes.confidence,
            prompt_tokens: llmRes.tokenUsage.prompt,
            completion_tokens: llmRes.tokenUsage.completion,
          },
        });

        return llmRes;
      } catch (err) {
        // If HybridRuntime fails for telemetry, fallback to returning cached response
        return { text: cached, route: 'cache', confidence: 0.9, tokenUsage: { prompt: Math.ceil(request.prompt.length/4), completion: Math.ceil(cached.length/4) } };
      }
    }

    // Build a runtime request and execute via the HybridRuntime to ensure governance
    const runtimeRequest: RuntimeRequest = {
      portal_type: context.portal_type,
      canonical_id: context.canonical_id,
      operation: 'inference',
      payload: { prompt: request.prompt, cacheKey: request.cacheKey, complexity: request.complexity },
      constraints: {},
    };

    const runtimeResult = await HybridRuntime.getInstance().execute(runtimeRequest);

    const data = runtimeResult.result as any;
    const text = typeof data === 'string' ? data : (data?.text || JSON.stringify(data));
    const estimateTokens = (v: string) => Math.ceil((v || '').length / 4);

    const route: LLMResponse['route'] = runtimeResult.telemetry.cache_hit
      ? 'cache'
      : runtimeResult.execution.execution_mode === 'cloud'
        ? 'cloud'
        : runtimeResult.execution.execution_mode === 'offline'
          ? 'offline_fallback'
          : 'local';

    const confidence = (data && data.confidence) ? data.confidence : (runtimeResult.success ? 0.75 : 0.3);

    const llmResponse: LLMResponse = {
      text,
      route,
      confidence,
      tokenUsage: {
        prompt: estimateTokens(request.prompt),
        completion: estimateTokens(text),
      },
    };

    if (llmResponse.text) setMemoryCachedResponse(request.cacheKey, llmResponse.text);

    Telemetry.emit({
      event: llmResponse.route === 'offline_fallback' ? 'OFFLINE_FALLBACK' : 'AI_ROUTED',
      source: 'intelligence',
      canonicalId: context.canonical_id,
      userId: context.user_id,
      portalType: context.portal_type,
      latency: Date.now() - start,
      operationType: 'AI_ROUTING',
      payload: {
        route: llmResponse.route,
        decision: llmResponse.route,
        confidence: llmResponse.confidence,
        prompt_tokens: llmResponse.tokenUsage.prompt,
        completion_tokens: llmResponse.tokenUsage.completion,
      },
    });

    return llmResponse;
  }
}
