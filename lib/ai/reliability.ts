import type { ValidationSchema } from './validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from '../logEvent';
import { callAIProxy, callOllama, DailyLimitError, ProviderHttpError, AIChatMessage } from './providers';
import { getActiveLearningMode } from '../../src/infrastructure/portalContext';
import { logAICall } from '../analytics';
import { resolveOllamaModel, OllamaModelRole } from '../ollamaModels';
import { GROQ_DEFAULT_MODEL } from '../groqConfig';
import { aiCircuitBreakers, CircuitBreaker } from './circuitBreaker';
import { resolveProviderSelection } from './providerResolver';
import { useSettingsStore as useSettingsStoreState } from '../../store/settingsStore';
import type { ModelProvider } from './providerSelection';

/**
 * Provider identity reported by the reliability layer.
 *
 * `hosted_claude` / `hosted_groq` aliases are gone: both previously called the
 * same server proxy while claiming a different source. The single selected
 * model rail is `hosted_proxy` or `local_ollama`; `cache`, `placeholder` and
 * `offline` describe the actual fallback source that answered.
 */
export type AIProvider = ModelProvider | 'cache' | 'placeholder';

export interface ReliabilityConfig<T> {
  /** The one model rail selected by `selectProvider`; omit only for offline-safe callers. */
  provider?: ModelProvider;
  /** When false, the hosted rail is skipped even if a session exists. */
  online?: boolean;
  /** Which local model role to use when the local rail was selected. */
  modelRole?: OllamaModelRole;
  /** Timeout per provider attempt in ms. */
  timeoutMs?: number;
  /** Maximum retries per provider attempt. */
  retries?: number;
  /** Base delay in ms for exponential backoff. */
  baseDelayMs?: number;
  /** Optional cache key for automatic AsyncStorage integration. */
  cacheKey?: string;
  /** Fallback data if all else fails. */
  fallbackPlaceholder: T;
  /** Optional validation schema for JSON structures. */
  validationSchema?: ValidationSchema<T>;
  /** Telemetry metadata. */
  context: {
    userId?: string;
    feature: 'explanation' | 'quiz' | 'roadmap' | 'other';
    metadata?: Record<string, unknown>;
  };
}

export interface ReliabilityResult<T> {
  success: boolean;
  data: T;
  /** Actual source that answered; always matches the rail that ran. */
  provider: AIProvider;
  /** The rail selected before retries/fallbacks. */
  selectedProvider: ModelProvider;
  latencyMs: number;
  estimatedCostUsd: number;
  attemptsUsed: number;
  error?: string;
  /** Machine-readable refusal reason for callers that must distinguish a
   * terminal daily cap from a transient failure. Never a credential. */
  errorCode?: string;
}

const isRetryable = (error: unknown): boolean =>
  !(error instanceof ProviderHttpError) || error.retryable;

const genericErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'An unexpected AI error occurred.';

/**
 * Wraps one selected model rail with timeout, bounded retries, a circuit
 * breaker, Zod verification, explicit cache/placeholder fallbacks and cost
 * tracking. It never chooses a different model rail on failure — that choice
 * belongs to `selectProvider` and is made before this function runs.
 */
export async function executeWithReliability<T>(
  systemPrompt: string,
  messages: AIChatMessage[],
  config: ReliabilityConfig<T>
): Promise<ReliabilityResult<T>> {
  const startTime = Date.now();
  const { ollamaUrl, ollamaChatModel } = useSettingsStoreState.getState();
  const selection = config.provider
    ? { provider: config.provider, reason: 'caller-supplied-selection' as const }
    : await resolveProviderSelection(config.online === undefined ? {} : { online: config.online });
  const selectedProvider = selection.provider;

  // One model rail at most; cache and placeholder are fallbacks, not providers.
  const chain: AIProvider[] = [];
  if (selectedProvider !== 'offline') chain.push(selectedProvider);
  if (config.cacheKey) chain.push('cache');
  chain.push('placeholder');

  const timeoutMs = config.timeoutMs ?? 15000;
  const maxRetries = config.retries ?? 3;
  const baseDelay = config.baseDelayMs ?? 1000;

  void logEvent('INFO', `[RELIABILITY] Starting AI wrapper for ${config.context.feature}`, {
    selectedProvider,
    selectionReason: selection.reason,
    chain,
    hasCacheKey: !!config.cacheKey,
    context: config.context,
  });

  let attemptsUsed = 0;
  // Preserve a user-readable provider message (for example a 429/5xx friendly
  // proxy error) so the final fallback never exposes a raw status or stack.
  let lastMeaningfulError: string | undefined;
  let lastErrorCode: string | undefined;

  const breakerForProvider = (provider: AIProvider): CircuitBreaker | null => {
    if (provider === 'hosted_proxy') return aiCircuitBreakers.hosted_proxy;
    if (provider === 'local_ollama') return aiCircuitBreakers.local_ollama;
    return null;
  };

  for (const provider of chain) {
    if (provider === 'cache') {
      if (config.cacheKey) {
        try {
          const cachedRaw = await AsyncStorage.getItem(config.cacheKey);
          if (cachedRaw !== null) {
            let data: T;
            if (config.validationSchema) {
              const parsed: unknown = JSON.parse(cachedRaw);
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

            const learningMode = getActiveLearningMode();
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
              selectedProvider,
              latencyMs: latency,
              estimatedCostUsd: 0,
              attemptsUsed
            };
          }
        } catch (cacheErr: unknown) {
          void logEvent('WARN', `[RELIABILITY] Cache lookup failed, moving to next provider`, {
            error: genericErrorMessage(cacheErr),
            cacheKey: config.cacheKey
          });
        }
      }
      continue;
    }

    if (provider === 'placeholder' || provider === 'offline') {
      const latency = Date.now() - startTime;
      const offline = selectedProvider === 'offline';
      const error = offline
        ? 'Offline: no model rail is available and no cached answer was found.'
        : lastMeaningfulError ?? 'All active providers failed. Placeholder served.';
      void logEvent('WARN', `[RELIABILITY] ${offline ? 'Offline' : 'Hard fallback'} for ${config.context.feature}`);

      const learningMode = getActiveLearningMode();
      void logAICall({
        user_id: config.context.userId,
        feature: config.context.feature,
        provider: offline ? 'offline' : 'placeholder',
        model: offline ? 'offline' : 'placeholder',
        portal: learningMode ?? undefined,
        success: false,
        latency_ms: latency,
        attempts_used: attemptsUsed,
        estimated_cost_usd: 0,
        error_code: lastErrorCode ?? (offline ? 'OFFLINE' : 'ALL_PROVIDERS_FAILED'),
        error_message: error,
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
        provider: offline ? 'offline' : 'placeholder',
        selectedProvider,
        latencyMs: latency,
        estimatedCostUsd: 0,
        attemptsUsed,
        error,
        errorCode: lastErrorCode ?? (offline ? 'OFFLINE' : 'ALL_PROVIDERS_FAILED'),
      };
    }

    const providerBreaker = breakerForProvider(provider);
    if (providerBreaker && !providerBreaker.canAttempt()) {
      void logEvent('WARN', `[RELIABILITY] Skipping ${provider}: circuit ${providerBreaker.state}`, {
        feature: config.context.feature,
        retryAt: providerBreaker.snapshot().retryAt,
      });
      continue;
    }

    let attempt = 0;
    while (attempt < maxRetries) {
      attemptsUsed++;
      const attemptStartTime = Date.now();
      try {
        void logEvent('INFO', `[RELIABILITY] Attempting ${provider} (retry ${attempt}/${maxRetries}) for ${config.context.feature}`);

        const responseText = await withTimeout(
          (async () => {
            if (provider === 'hosted_proxy') {
              return await callAIProxy(systemPrompt, messages);
            }
            if (provider === 'local_ollama') {
              return await callOllama(
                systemPrompt,
                messages,
                ollamaUrl,
                config.modelRole ?? 'reasoning',
                !!config.validationSchema,
                ollamaChatModel,
              );
            }
            throw new Error(`Unknown provider: ${String(provider)}`);
          })(),
          timeoutMs,
          `[AI TIMEOUT] Provider ${provider} took too long (>${timeoutMs}ms)`
        );

        if (!responseText || responseText.trim() === '') {
          throw new Error('Received empty response from provider');
        }

        let finalData: T;
        if (config.validationSchema) {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON structure found in raw output');
          }
          const parsed: unknown = JSON.parse(jsonMatch[0].trim());
          const validationResult = config.validationSchema.safeParse(parsed);
          if (!validationResult.success) {
            throw new Error(`JSON schema validation failed: ${validationResult.error.message}`);
          }
          finalData = validationResult.data;
        } else {
          finalData = responseText as unknown as T;
        }

        providerBreaker?.recordSuccess();
        const attemptEndTime = Date.now();
        const latencyMs = attemptEndTime - attemptStartTime;
        const totalDurationMs = attemptEndTime - startTime;

        const userPromptLength = messages.reduce((acc, m) => acc + m.content.length, 0);
        const inputTokens = Math.ceil((systemPrompt.length + userPromptLength) / 4);
        const outputTokens = Math.ceil(responseText.length / 4);
        const totalTokens = inputTokens + outputTokens;

        // The server proxy currently routes to Groq; charge its published rates.
        let cost = 0;
        let model = 'unknown';
        if (provider === 'hosted_proxy') {
          model = GROQ_DEFAULT_MODEL;
          cost = (inputTokens * 0.00000005) + (outputTokens * 0.00000008);
        } else if (provider === 'local_ollama') {
          model = resolveOllamaModel('reasoning', ollamaChatModel);
        }

        void logEvent('INFO', `[RELIABILITY] Provider ${provider} success for ${config.context.feature}`, {
          latencyMs,
          totalDurationMs,
          estimatedCostUsd: cost,
          estimatedTokens: { inputTokens, outputTokens, totalTokens }
        });

        if (config.cacheKey) {
          try {
            const rawString = typeof finalData === 'string' ? finalData : JSON.stringify(finalData);
            await AsyncStorage.setItem(config.cacheKey, rawString);
          } catch (cacheStoreErr: unknown) {
            void logEvent('WARN', '[RELIABILITY] Failed to save result to AsyncStorage cache', {
              error: genericErrorMessage(cacheStoreErr)
            });
          }
        }

        const learningMode = getActiveLearningMode();
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
          selectedProvider,
          latencyMs: totalDurationMs,
          estimatedCostUsd: cost,
          attemptsUsed
        };

      } catch (err: unknown) {
        attempt++;
        const message = genericErrorMessage(err);
        if (err instanceof ProviderHttpError) lastMeaningfulError = message;
        const errorCode = err instanceof DailyLimitError
          ? 'DAILY_LIMIT'
          : err instanceof ProviderHttpError
            ? (err.status === 429 ? 'RATE_LIMITED' : `HTTP_${err.status}`)
            : message.includes('TIMEOUT') ? 'TIMEOUT'
              : message.includes('validation') ? 'VALIDATION_FAILED' : 'PROVIDER_ERROR';
        lastErrorCode = errorCode;

        void logEvent('WARN', `[RELIABILITY] Provider ${provider} attempt ${attempt} failed`, {
          error: message,
          errorCode,
          retryable: isRetryable(err),
          nextAction: isRetryable(err) && attempt < maxRetries ? 'retrying' : 'falling back'
        });

        if (!isRetryable(err) || attempt >= maxRetries) {
          if (isRetryable(err)) providerBreaker?.recordFailure();
          const learningMode = getActiveLearningMode();
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
            error_message: message,
            metadata: config.context.metadata,
          });
          break;
        }

        // Exponential backoff with jitter (100ms - 300ms random range).
        const backoff = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 200 + 100;
        const totalDelay = backoff + jitter;
        void logEvent('INFO', `[RELIABILITY] Sleeping for ${Math.round(totalDelay)}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }
  }

  const finalLatency = Date.now() - startTime;
  void logEvent('ERROR', `[RELIABILITY] [CRITICAL] AI wrapper chain exhausted for ${config.context.feature}`);

  const learningMode = getActiveLearningMode();
  void logAICall({
    user_id: config.context.userId,
    feature: config.context.feature,
    provider: selectedProvider === 'offline' ? 'offline' : 'placeholder',
    model: 'fallback',
    portal: learningMode ?? undefined,
    success: false,
    latency_ms: finalLatency,
    attempts_used: attemptsUsed,
    estimated_cost_usd: 0,
    error_code: lastErrorCode ?? (selectedProvider === 'offline' ? 'OFFLINE' : 'ALL_PROVIDERS_FAILED'),
    error_message: lastMeaningfulError ?? 'No model rail answered. Fallback payload returned.',
    metadata: config.context.metadata,
  });

  return {
    success: false,
    data: config.fallbackPlaceholder,
    provider: selectedProvider === 'offline' ? 'offline' : 'placeholder',
    selectedProvider,
    latencyMs: finalLatency,
    estimatedCostUsd: 0,
    attemptsUsed,
    error: lastMeaningfulError ?? 'No model rail answered. Fallback payload returned.',
    errorCode: lastErrorCode ?? (selectedProvider === 'offline' ? 'OFFLINE' : 'ALL_PROVIDERS_FAILED'),
  };
}

/** Raised when an operation is cancelled through an AbortSignal. */
export class AbortError extends Error {
  readonly name = 'AbortError';
  constructor(message = 'Operation cancelled') {
    super(message);
  }
}

/** Raised when a total wall-clock deadline is exceeded. */
export class DeadlineError extends Error {
  readonly name = 'DeadlineError';
  constructor(message: string) {
    super(message);
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof AbortError || (err instanceof Error && err.name === 'AbortError');
}

const abortReasonError = (reason: unknown): Error => {
  if (reason instanceof Error) return reason;
  return new AbortError(typeof reason === 'string' ? reason : 'Operation cancelled');
};

/**
 * Universal timeout utility with AbortController or promise-based rejection.
 * When `signal` is supplied, aborting it rejects immediately (the underlying
 * promise is not cancelled, but callers stop waiting on it).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackMessage = 'Request timed out',
  signal?: AbortSignal,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;
  let onAbort: (() => void) | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(fallbackMessage));
    }, timeoutMs);
    if (signal) {
      if (signal.aborted) {
        reject(abortReasonError(signal.reason));
      } else {
        onAbort = () => reject(abortReasonError(signal.reason));
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
    if (signal && onAbort) signal.removeEventListener('abort', onAbort);
  });
}

export interface DeadlineOptions {
  /** External cancel signal; the caller owns the matching AbortController. */
  signal?: AbortSignal;
  /** Total wall-clock budget. Retries and backoff consume this same budget. */
  deadlineMs: number;
  /** Retries after the first attempt (default 1). */
  maxRetries?: number;
  baseDelayMs?: number;
  /** Return false to avoid retrying an error. Abort/deadline errors are never retried. */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Run `fn` under one total wall-clock deadline with cooperative cancellation.
 */
export async function withDeadline<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  {
    signal,
    deadlineMs,
    maxRetries = 1,
    baseDelayMs = 250,
    shouldRetry = () => true,
  }: DeadlineOptions,
): Promise<T> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const abort = (reason: unknown) => {
    if (!controller.signal.aborted) controller.abort(reason);
  };

  const onExternalAbort = () => abort(signal?.reason ?? 'cancelled');
  if (signal) {
    if (signal.aborted) onExternalAbort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const deadlineTimer = setTimeout(
    () => abort(new DeadlineError('Request exceeded its time budget')),
    deadlineMs,
  );

  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      'abort',
      () => reject(abortReasonError(controller.signal.reason)),
      { once: true },
    );
  });
  void aborted.catch(() => {});

  try {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (controller.signal.aborted) throw abortReasonError(controller.signal.reason);
      try {
        return await Promise.race([fn(controller.signal), aborted]);
      } catch (err) {
        lastError = err as Error;
        if (controller.signal.aborted) throw abortReasonError(controller.signal.reason);
        if (lastError instanceof DeadlineError || isAbortError(lastError)) throw lastError;
        if (attempt === maxRetries || !shouldRetry(lastError)) break;
        const remaining = Math.max(0, deadlineMs - (Date.now() - startedAt));
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), remaining);
        if (delay <= 0) break;
        await Promise.race([
          new Promise<void>((resolve) => setTimeout(resolve, delay)),
          aborted,
        ]);
      }
    }
    throw lastError ?? new Error('Operation failed');
  } finally {
    clearTimeout(deadlineTimer);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Retry a promise with exponential backoff. Returns the result of the first
 * successful attempt, or throws the last error if all attempts fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 2, baseDelayMs = 1000, shouldRetry = () => true }: {
    maxRetries?: number;
    baseDelayMs?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt === maxRetries || !shouldRetry(lastError)) break;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
