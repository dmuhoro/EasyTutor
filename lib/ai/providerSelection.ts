/**
 * Single source of truth for model-provider selection.
 *
 * This module is deliberately pure: no platform checks, no settings reads, no
 * network probes and no Supabase calls. Callers pass in the facts; this function
 * makes the decision. The impure resolver that gathers those facts lives beside
 * it in `providerResolver.ts`, so every live path can share one decision.
 *
 * Precedence (EPIC M1 T2): hosted proxy → enabled/reachable Ollama → offline.
 */

export type ModelProvider = 'hosted_proxy' | 'local_ollama' | 'offline';

export interface ProviderSelectionContext {
  /** Whether a hosted network call is permitted at all. */
  online: boolean;
  /** Hosted proxy is configured and the learner has a session token. */
  hostedReady: boolean;
  /** Local mode is explicitly enabled and the URL is permitted for this runtime. */
  localEnabled: boolean;
  /** The enabled local model server answered its reachability probe. */
  localReachable: boolean;
}

export type ProviderSelectionReason =
  | 'hosted-proxy-ready'
  | 'local-ollama-opted-in-and-reachable'
  | 'offline-no-network'
  | 'offline-hosted-unavailable';

export interface ProviderSelection {
  provider: ModelProvider;
  reason: ProviderSelectionReason;
}

/**
 * Decide which model rail may be used. Never performs I/O; never falls through
 * to a rail whose preconditions were not supplied by the caller.
 */
export function selectProvider(context: ProviderSelectionContext): ProviderSelection {
  const localUsable = context.localEnabled && context.localReachable;

  if (context.online && context.hostedReady) {
    return { provider: 'hosted_proxy', reason: 'hosted-proxy-ready' };
  }
  if (localUsable) {
    return { provider: 'local_ollama', reason: 'local-ollama-opted-in-and-reachable' };
  }
  if (!context.online) {
    return { provider: 'offline', reason: 'offline-no-network' };
  }
  return { provider: 'offline', reason: 'offline-hosted-unavailable' };
}
