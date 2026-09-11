import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthenticatedUser, getSupabaseClient, logSupabaseError } from './supabaseOps';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * STRICTLY allowed event types per Sprint 1 Day 2 mandate.
 */
export type AnalyticsEvent =
  | 'user_registered'
  | 'portal_selected'
  | 'roadmap_generated'
  | 'quiz_started'
  | 'quiz_completed'
  | 'quiz_score_recorded'
  | 'session_started'
  | 'session_ended'
  | 'ai_literacy_started'
  | 'ai_literacy_unit_completed'
  | 'ai_literacy_resumed'
  | 'ai_literacy_remediation_viewed'
  | 'ai_literacy_review_started'
  | 'ai_literacy_mastered'
  | 'ai_literacy_spaced_review_started'
  | 'question_bank_started'
  | 'question_bank_completed'
  | 'practice_started'
  | 'practice_completed'
  | 'mastery_updated'
  | 'weak_topic_detected'
  | 'streak_updated'
  | 'momentum_score_updated'
  | 'adaptive_session_started'
  | 'adaptive_difficulty_changed'
  | 'performance_profile_updated'
  | 'fluency_level_changed';

export interface EventMetadata {
  user_id?: string;
  learning_mode?: string;
  [key: string]: any;
}

export interface AICallLogPayload {
  user_id?: string;
  feature: 'explanation' | 'quiz' | 'roadmap' | 'other';
  provider: 'hosted_claude' | 'hosted_groq' | 'local_ollama' | 'cache' | 'placeholder';
  model?: string;
  portal?: string;
  success: boolean;
  latency_ms?: number;
  attempts_used?: number;
  estimated_cost_usd?: number;
  error_code?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline Queue (AsyncStorage-backed, FIFO, max 100 entries)
// ─────────────────────────────────────────────────────────────────────────────

const OFFLINE_QUEUE_KEY = 'analytics_queue'; // Mandated key
const OFFLINE_QUEUE_MAX = 100;

interface QueuedEvent {
  event_id: string;
  created_at: string;
  event: AnalyticsEvent;
  payload: EventMetadata;
}

let isFlushingQueue = false;
let enqueueChain: Promise<void> = Promise.resolve();

const safeRandomId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Ignore and use fallback
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const dedupeByEventId = (events: QueuedEvent[]): QueuedEvent[] => {
  const map = new Map<string, QueuedEvent>();
  for (const entry of events) {
    if (!map.has(entry.event_id)) {
      map.set(entry.event_id, entry);
    }
  }
  return [...map.values()];
};

const enqueueOfflineEvent = async (entry: QueuedEvent): Promise<void> => {
  enqueueChain = enqueueChain.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const existing: QueuedEvent[] = raw ? JSON.parse(raw) : [];

      // Cap at 100 — FIFO
      const next = dedupeByEventId([...existing, entry]).slice(-OFFLINE_QUEUE_MAX);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
    } catch {
      // Never throw in analytics
    }
  });

  await enqueueChain;
};

/**
 * Flushes all queued offline events to Supabase.
 * Call this on AppState 'active' (foreground).
 */
export const flushAnalyticsQueue = async (): Promise<void> => {
  if (isFlushingQueue) return;
  isFlushingQueue = true;
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;

    const queued = dedupeByEventId(JSON.parse(raw) as QueuedEvent[]);
    if (queued.length === 0) return;

    if (__DEV__) {
      console.log(`[Analytics] Flushing ${queued.length} queued offline events`);
    }

    // Send each queued event and preserve only failures
    const successfulEventIds = new Set<string>();
    const failedById = new Map<string, QueuedEvent>();
    for (const item of queued) {
      try {
        await sendEventToSupabase(item);
        successfulEventIds.add(item.event_id);
      } catch {
        failedById.set(item.event_id, item);
      }
    }
    
    // Merge with latest queue to avoid dropping events added mid-flush.
    const latestRaw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const latestQueued = latestRaw ? (JSON.parse(latestRaw) as QueuedEvent[]) : [];
    const nextQueue = dedupeByEventId(
      latestQueued
        .filter((entry) => !successfulEventIds.has(entry.event_id))
        .map((entry) => failedById.get(entry.event_id) ?? entry),
    ).slice(-OFFLINE_QUEUE_MAX);

    if (nextQueue.length === 0) {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      return;
    }

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
  } catch {
    // Never throw
  } finally {
    isFlushingQueue = false;
  }
};

const sendEventToSupabase = async (entry: QueuedEvent): Promise<void> => {
  const { user_id, learning_mode, ...metadata } = entry.payload;

  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();
    
    const { error } = await client.from('user_events').insert({
      user_id: user.id,
      event_name: entry.event,
      event_id: entry.event_id,
      learning_mode: learning_mode || 'unknown',
      metadata,
      timestamp: entry.created_at,
    });

    if (error) {
      logSupabaseError('user_events', 'insert', error);
      throw error; // Trigger re-enqueue in caller
    }
  };

// ─────────────────────────────────────────────────────────────────────────────
// Unified track() Utility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unified tracking utility.
 * Fire-and-forget, offline-first, never throws.
 */
export const track = (event: AnalyticsEvent, payload: EventMetadata = {}): void => {
  if (__DEV__) {
    console.log(`[Analytics] Track: ${event}`, payload);
  }

  const entry: QueuedEvent = {
    event_id: safeRandomId(),
    created_at: new Date().toISOString(),
    event,
    payload,
  };

  // Fire-and-forget
  void (async () => {
    try {
      await sendEventToSupabase(entry);
    } catch {
      // Network failure or Supabase error — queue offline
      await enqueueOfflineEvent(entry);
    }
  })();
};

// Legacy compatibility (optional, but good to keep if used elsewhere)
export const trackEvent = (event: any, payload: any) => track(event as AnalyticsEvent, payload);
export const safeTrackEvent = (event: any, payload: any) => track(event as AnalyticsEvent, payload);

// ─────────────────────────────────────────────────────────────────────────────
// logAICall — persists AI call results to ai_call_logs
// ─────────────────────────────────────────────────────────────────────────────

export const logAICall = (log: AICallLogPayload): void => {
  if (__DEV__) {
    console.log(`[Analytics][AI] ${log.feature} via ${log.provider}`, {
      success: log.success,
      latency_ms: log.latency_ms,
      cost: log.estimated_cost_usd,
    });
  }

  // Fire-and-forget
  void (async () => {
    try {
      const client = getSupabaseClient();
      const user = await getAuthenticatedUser();

      const { error } = await client.from('ai_call_logs').insert({
        user_id: user.id,
        feature: log.feature,
        provider: log.provider,
        model: log.model ?? null,
        portal: log.portal ?? null,
        success: log.success,
        latency_ms: log.latency_ms ?? null,
        attempts_used: log.attempts_used ?? null,
        estimated_cost_usd: log.estimated_cost_usd ?? 0,
        error_code: log.error_code ?? null,
        error_message: log.error_message ?? null,
        metadata: log.metadata ?? {},
        created_at: new Date().toISOString(),
      });

      if (error) {
        logSupabaseError('ai_call_logs', 'insert', error);
      }
    } catch {
      // Never throw in analytics
    }
  })();
};
