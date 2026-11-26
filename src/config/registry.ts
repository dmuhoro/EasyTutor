import { LEGACY_COLORS } from '../design/legacyPalette';
/**
 * CENTRAL CONFIG REGISTRY
 * 
 * Centralized authority for all system thresholds, timeouts, and constants.
 * No hardcoded magic values allowed across the codebase.
 */

import { PortalType } from "../types/canonical";

export const SYSTEM_CONFIG = {
  AI: {
    DEFAULT_TIMEOUT_MS: 15000,
    RETRY_ATTEMPTS: 3,
    ROUTING: {
      PREFER_LOCAL: true,
      LOCAL_URL: 'http://localhost:11434',
      DEFAULT_MODEL: 'llama3.2',
    }
  },
  
  MASTERY: {
    THRESHOLDS: {
      BEGINNER: 0,
      EXPLORER: 100,
      SCHOLAR: 300,
      ADVANCED: 600,
      EXPERT: 1000,
    },
    PASSING_SCORE: 80, // Percentage
    DECAY_RATE: 0.05, // Daily mastery decay
  },
  
  PORTALS: {
    high_school: {
      enabled: true,
      theme_color: LEGACY_COLORS.blue500,
      id_prefix: 'HS',
    },
    university: {
      enabled: true,
      theme_color: LEGACY_COLORS.purple500Bright,
      id_prefix: 'UNI',
    },
    knowledge_explorer: {
      enabled: true,
      theme_color: LEGACY_COLORS.green500,
      id_prefix: 'KE',
    }
  },
  
  RETRIEVAL: {
    DEFAULT_LIMIT: 5,
    MIN_SIMILARITY: 0.7,
  },

  GROQ: {
    // Model allowlist — only these models may be called via the ai-proxy edge
    // function or the custom Groq provider. Kept in sync with
    // supabase/functions/ai-proxy/index.ts MODEL_ALLOWLIST.
    MODEL_ALLOWLIST: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'] as const,
    DEFAULT_MODEL: 'llama-3.1-8b-instant',
    // Edge function health check endpoint (called on startup + provider failure).
    HEALTH_CHECK_PATH: '/functions/v1/ai-proxy/health',
  },
  
  SYNC: {
    BATCH_SIZE: 20,
    POLLING_INTERVAL_MS: 30000,
  },
  
  CACHE: {
    TTL_SECONDS: 3600 * 24, // 24 hours
  }
};

/**
 * Total portal config lookup. Never returns undefined — falls back to the
 * knowledge_explorer theme if the portal type is missing from the registry.
 * Callers should not index SYSTEM_CONFIG.PORTALS directly.
 */
export interface PortalConfig {
  enabled: boolean;
  theme_color: string;
  id_prefix: string;
}

export function getPortalConfig(portalType: PortalType): PortalConfig {
  const config = SYSTEM_CONFIG.PORTALS[portalType];
  if (config) return config;
  // Fallback: knowledge_explorer is the default portal used when
  // learningMode is 'self_directed' (see normalizePortalType).
  return SYSTEM_CONFIG.PORTALS.knowledge_explorer;
}
