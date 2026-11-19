/**
 * Impure fact-gathering around the pure `selectProvider` decision.
 *
 * Only this module reads settings, the Supabase session and Ollama reachability.
 * It never chooses a provider itself; it hands the facts to `selectProvider`.
 */
import { useSettingsStore } from '../../store/settingsStore';
import { getSupabaseClient } from '../supabaseOps';
import { canUseLocalModelServer, isLocalModelServerReachable } from './endpointPolicy';
import {
  selectProvider,
  type ProviderSelection,
  type ProviderSelectionContext,
} from './providerSelection';

const hostedProxyReady = async (): Promise<boolean> => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    return !error && Boolean(data?.session?.access_token);
  } catch {
    // No configured client means no hosted rail. Fail closed to offline/local.
    return false;
  }
};

/**
 * Resolve one provider decision for a live request. Callers may override facts
 * they already know (for example an orchestrator's offline connectivity state);
 * they may not bypass `selectProvider`.
 */
export async function resolveProviderSelection(
  overrides: Partial<ProviderSelectionContext> = {},
): Promise<ProviderSelection> {
  const { aiMode, ollamaUrl } = useSettingsStore.getState();
  const localEnabled =
    overrides.localEnabled ?? canUseLocalModelServer(ollamaUrl, aiMode);
  const localReachable =
    overrides.localReachable ??
    (localEnabled ? await isLocalModelServerReachable(ollamaUrl) : false);
  const hostedReady = overrides.hostedReady ?? await hostedProxyReady();
  const online = overrides.online ?? true;

  return selectProvider({ online, hostedReady, localEnabled, localReachable });
}
