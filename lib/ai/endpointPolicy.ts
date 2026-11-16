/**
 * Where a model call is allowed to go.
 *
 * The published web app must never fire requests at the developer's loopback
 * Ollama server: a browser on a classmate's laptop has nothing on
 * `localhost:11434`, so the call fails — and a "local-first" embedder that
 * always runs first made the AI tutor unusable for every real user.
 *
 * Rules:
 *   - `hosted` / `custom` mode never touches a local model server.
 *   - `local` mode is an explicit opt-in. On web, a loopback URL is still
 *     refused (a `localhost` model only exists on the machine that serves the
 *     browser); a LAN URL is allowed once it answers a reachability probe.
 *   - Anything else (native app) may use the configured URL once reachable.
 */
import { Platform } from 'react-native';
import { normalizeOllamaUrl } from '../ollamaModels';

export type AIMode = 'hosted' | 'local' | 'custom';

const LOOPBACK_HOSTS = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\]|::1)$/i;

/** Hostname of a URL, tolerating a bare `host:port` setting. Null if invalid. */
export function hostOf(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`).hostname;
  } catch {
    return null;
  }
}

export const isLoopbackUrl = (url: string): boolean => {
  const host = hostOf(url);
  return host !== null && LOOPBACK_HOSTS.test(host);
};

export const isWebRuntime = (): boolean => Platform.OS === 'web';

/** True when this build/mode is allowed to talk to the configured local server. */
export function canUseLocalModelServer(url: string, aiMode: AIMode): boolean {
  if (aiMode !== 'local') return false;
  if (!url.trim()) return false;
  if (isWebRuntime() && isLoopbackUrl(url)) return false;
  return true;
}

interface ReachabilityEntry {
  checkedAt: number;
  reachable: boolean;
}

const REACHABILITY_TTL_MS = 30_000;
const reachability = new Map<string, ReachabilityEntry>();

/**
 * Probe `{base}/api/tags` with a short timeout. Cached for 30s so a chat turn
 * does not pay the probe twice (chat + embedding).
 */
export async function isLocalModelServerReachable(
  url: string,
  options: { timeoutMs?: number; now?: () => number; force?: boolean } = {},
): Promise<boolean> {
  const base = normalizeOllamaUrl(url);
  if (!base) return false;

  const now = options.now ?? Date.now;
  const cached = reachability.get(base);
  if (!options.force && cached && now() - cached.checkedAt < REACHABILITY_TTL_MS) {
    return cached.reachable;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 1_500);
  let reachable = false;
  try {
    const res = await fetch(`${base}/api/tags`, { method: 'GET', signal: controller.signal });
    reachable = res.ok;
  } catch {
    // unreachable; keep reachable false
  } finally {
    clearTimeout(timeout);
  }

  reachability.set(base, { checkedAt: now(), reachable });
  return reachable;
}

/** Test helper: forget cached probe results. */
export function resetLocalModelReachability(): void {
  reachability.clear();
}
