import { ZodSchema } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from '../logEvent';
import { callAnthropic, callGroq, callOllama, AIChatMessage } from '../api';
import { useSettingsStore } from '../../store/settingsStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { logAICall } from '../analytics';

export type AIProvider = 'hosted_claude' | 'hosted_groq' | 'local_ollama' | 'cache' | 'placeholder';

export interface ReliabilityConfig<T> {
  // Chain of providers to attempt in sequence
  providers?: AIProvider[];
  // Timeout per provider attempt in ms
  timeoutMs?: number;
  // Maximum retries per provider attempt
  retries?: number;
  // Base delay in ms for exponential backoff
  baseDelayMs?: number;
  // Optional cache key for automatic AsyncStorage integration
  cacheKey?: string;
  // Fallback data if all else fails
  fallbackPlaceholder: T;
  // Optional validation schema for JSON structures
  validationSchema?: ZodSchema<T>;
  // Telemetry metadata
  context: {
    userId?: string;
    feature: 'explanation' | 'quiz' | 'roadmap' | 'other';
    metadata?: Record<string, any>;
  };
}

export interface ReliabilityResult<T> {
  success: boolean;
  data: T;
  provider: AIProvider;
  latencyMs: number;
  estimatedCostUsd: number;
  attemptsUsed: number;
  error?: string;
}

/**
 * Universally wraps AI calls with timeout, jittered retries, multi-provider fallback, Zod verification, and cost tracking.
 */
export async function executeWithReliability<T>(
  systemPrompt: string,
  messages: AIChatMessage[],
  config: ReliabilityConfig<T>
): Promise<ReliabilityResult<T>> {
  const startTime = Date.now();
  const providers = config.providers || ['hosted_claude', 'hosted_groq', 'local_ollama', 'cache', 'placeholder'];
  const timeoutMs = config.timeoutMs || 15000;
  const maxRetries = config.retries !== undefined ? config.retries : 3;
  const baseDelay = config.baseDelayMs || 1000;

  const { ollamaUrl, ollamaModel } = useSettingsStore.getState();

  // Log start event
  void logEvent('INFO', `[RELIABILITY] Starting AI wrapper chain for ${config.context.feature}`, {
    providers,
    hasCacheKey: !!config.cacheKey,
    context: config.context
  });

  let attemptsUsed = 0;

  for (const provider of providers) {
    if (provider === 'cache') {
      if (config.cacheKey) {
        try {
          const cachedRaw = await AsyncStorage.getItem(config.cacheKey);
          if (cachedRaw !== null) {
            let data: T;
            if (config.validationSchema) {
              const parsed = JSON.parse(cachedRaw);
              const validated = config.validationSchema.safeParse(parsed);
              if (validated.success) {
                data = validated.data;
              } else {
                throw new Error(`Cached data Zod validation failed: ${validated.error.message}`);
              }
            } else {
              data = cachedRaw as unknown as T;
            }

            const latency = Date.now() - startTime;
            void logEvent('INFO', `[RELIABILITY] Loaded from Cache for ${config.context.feature}`, {
              cacheKey: config.cacheKey,
              latencyMs: latency
            });

            // Persist cache hit to ai_call_logs (fire-and-forget)
            const { learningMode } = useRoadmapStore.getState();
            void logAICall({
              user_id: config.context.userId,
              feature: config.context.feature,
              provider: 'cache',
              model: 'cache',
              portal: learningMode ?? undefined,
              success: true,
              latency_ms: latency,
              attempts_used: attemptsUsed,
              estimated_cost_usd: 0,
              metadata: {
                ...(config.context.metadata ?? {}),
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
              },
            });

            return {
              success: true,
              data,
              provider: 'cache',
              latencyMs: latency,
              estimatedCostUsd: 0,
              attemptsUsed
            };
          }
        } catch (cacheErr: any) {
          void logEvent('WARN', `[RELIABILITY] Cache lookup failed, moving to next provider`, {
            error: cacheErr?.message,
            cacheKey: config.cacheKey
          });
        }
      }
      continue;
    }

    if (provider === 'placeholder') {
      const latency = Date.now() - startTime;
      void logEvent('WARN', `[RELIABILITY] Hard fallback to placeholder for ${config.context.feature}`, {
        fallbackValue: config.fallbackPlaceholder
      });

      // Persist placeholder fallback to ai_call_logs (fire-and-forget)
      const { learningMode } = useRoadmapStore.getState();
      void logAICall({
        user_id: config.context.userId,
        feature: config.context.feature,
        provider: 'placeholder',
        model: 'placeholder',
        portal: learningMode ?? undefined,
        success: false,
        latency_ms: latency,
        attempts_used: attemptsUsed,
        estimated_cost_usd: 0,
        error_code: 'ALL_PROVIDERS_FAILED',
        error_message: 'All active providers failed. Placeholder served.',
        metadata: {
          ...(config.context.metadata ?? {}),
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      });

      return {
        success: false,
        data: config.fallbackPlaceholder,
        provider: 'placeholder',
        latencyMs: latency,
        estimatedCostUsd: 0,
        attemptsUsed,
        error: 'All active providers failed. Placeholder served.'
      };
    }

    // Call provider with timeout and retry logic
    let attempt = 0;
    while (attempt < maxRetries) {
      attemptsUsed++;
      const attemptStartTime = Date.now();
      try {
        void logEvent('INFO', `[RELIABILITY] Attempting provider ${provider} (retry ${attempt}/${maxRetries}) for ${config.context.feature}`);

        // 1. Timeout wrap the LLM call
        const responseText = await withTimeout(
          (async () => {
            switch (provider) {
              case 'hosted_claude':
                return await callAnthropic(systemPrompt, messages);
              case 'hosted_groq':
                return await callGroq(systemPrompt, messages);
              case 'local_ollama':
                return await callOllama(systemPrompt, messages, ollamaUrl, ollamaModel, !!config.validationSchema);
              default:
                throw new Error(`Unknown provider: ${provider}`);
            }
          })(),
          timeoutMs,
          `[AI TIMEOUT] Provider ${provider} took too long (>${timeoutMs}ms)`
        );

        if (!responseText || responseText.trim() === '') {
          throw new Error('Received empty response from provider');
        }

        // 2. Parse & validate if Zod schema exists
        let finalData: T;
        if (config.validationSchema) {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON structure found in raw output');
          }
          const parsed = JSON.parse(jsonMatch[0].trim());
          const validationResult = config.validationSchema.safeParse(parsed);
          if (!validationResult.success) {
            throw new Error(`JSON schema validation failed: ${validationResult.error.message}`);
          }
          finalData = validationResult.data;
        } else {
          finalData = responseText as unknown as T;
        }

        // 3. Compute cost and metrics
        const attemptEndTime = Date.now();
        const latencyMs = attemptEndTime - attemptStartTime;
        const totalDurationMs = attemptEndTime - startTime;

        // Estimate tokens
        const userPromptLength = messages.reduce((acc, m) => acc + m.content.length, 0);
        const inputTokens = Math.ceil((systemPrompt.length + userPromptLength) / 4);
        const outputTokens = Math.ceil(responseText.length / 4);
        const totalTokens = inputTokens + outputTokens;

        // Cost tables based on 2026 rates
        let cost = 0;
        let model = 'unknown';
        if (provider === 'hosted_claude') {
          model = 'claude-3-5-sonnet-latest';
          // Claude 3.5 Sonnet: Input $3.00/M, Output $15.00/M
          cost = (inputTokens * 0.000003) + (outputTokens * 0.000015);
        } else if (provider === 'hosted_groq') {
          model = 'llama-3.1-8b-instant';
          // Llama 3.1 8b on Groq: Input $0.05/M, Output $0.08/M
          cost = (inputTokens * 0.00000005) + (outputTokens * 0.00000008);
        } else if (provider === 'local_ollama') {
          model = ollamaModel;
        }

        // Log successful operation metrics
        void logEvent('INFO', `[RELIABILITY] Provider ${provider} success for ${config.context.feature}`, {
          latencyMs,
          totalDurationMs,
          estimatedCostUsd: cost,
          estimatedTokens: { inputTokens, outputTokens, totalTokens }
        });

        // Save successfully validated result to AsyncStorage if cacheKey is present
        if (config.cacheKey) {
          try {
            const rawString = typeof finalData === 'string' ? finalData : JSON.stringify(finalData);
            await AsyncStorage.setItem(config.cacheKey, rawString);
          } catch (cacheStoreErr: any) {
            void logEvent('WARN', '[RELIABILITY] Failed to save result to AsyncStorage cache', {
              error: cacheStoreErr?.message
            });
          }
        }

        // Persist successful AI call to ai_call_logs (fire-and-forget)
        const { learningMode } = useRoadmapStore.getState();
        void logAICall({
          user_id: config.context.userId,
          feature: config.context.feature,
          provider,
          model,
          portal: learningMode ?? undefined,
          success: true,
          latency_ms: totalDurationMs,
          attempts_used: attemptsUsed,
          estimated_cost_usd: cost,
          metadata: {
            ...(config.context.metadata ?? {}),
            inputTokens,
            outputTokens,
            totalTokens,
          },
        });

        return {
          success: true,
          data: finalData,
          provider,
          latencyMs: totalDurationMs,
          estimatedCostUsd: cost,
          attemptsUsed
        };

      } catch (err: any) {
        attempt++;
        const errorCode = err?.message?.includes('TIMEOUT') ? 'TIMEOUT' : 
                          err?.message?.includes('validation') ? 'VALIDATION_FAILED' : 'PROVIDER_ERROR';

        void logEvent('WARN', `[RELIABILITY] Provider ${provider} attempt ${attempt} failed`, {
          error: err?.message,
          errorCode,
          nextAction: attempt < maxRetries ? 'retrying' : 'falling back'
        });

        if (attempt >= maxRetries) {
          // Log failure for this specific provider if exhausted
          const { learningMode } = useRoadmapStore.getState();
          void logAICall({
            user_id: config.context.userId,
            feature: config.context.feature,
            provider,
            portal: learningMode ?? undefined,
            success: false,
            latency_ms: Date.now() - startTime,
            attempts_used: attemptsUsed,
            estimated_cost_usd: 0,
            error_code: errorCode,
            error_message: err?.message,
            metadata: config.context.metadata,
          });
          break; // Move to next provider in the chain
        }

        // Exponential backoff with jitter (100ms - 300ms random range)
        const backoff = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 200 + 100;
        const totalDelay = backoff + jitter;
        void logEvent('INFO', `[RELIABILITY] Sleeping for ${Math.round(totalDelay)}ms before retry...`);
        await new Promise(res => setTimeout(res, totalDelay));
      }
    }
  }

  // If we reach here, absolutely everything failed
  const finalLatency = Date.now() - startTime;
  void logEvent('ERROR', `[RELIABILITY] [CRITICAL] AI wrapper chain completely exhausted for ${config.context.feature}`);

  // Persist total exhaustion to ai_call_logs (fire-and-forget)
  const { learningMode } = useRoadmapStore.getState();
  void logAICall({
    user_id: config.context.userId,
    feature: config.context.feature,
    provider: 'placeholder',
    model: 'placeholder',
    portal: learningMode ?? undefined,
    success: false,
    latency_ms: finalLatency,
    attempts_used: attemptsUsed,
    estimated_cost_usd: 0,
    error_code: 'ALL_PROVIDERS_FAILED',
    error_message: 'All providers failed. Fallback payload returned.',
    metadata: config.context.metadata,
  });

  return {
    success: false,
    data: config.fallbackPlaceholder,
    provider: 'placeholder',
    latencyMs: finalLatency,
    estimatedCostUsd: 0,
    attemptsUsed,
    error: 'All providers failed. Fallback payload returned.'
  };
}

/**
 * Universal timeout utility with AbortController or promise-based rejection.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackMessage = 'Request timed out'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(fallbackMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}
