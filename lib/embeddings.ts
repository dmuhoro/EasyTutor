import { useSettingsStore } from '../store/settingsStore';
import { normalizeOllamaUrl, resolveOllamaModel } from './ollamaModels';
import {
  canUseLocalModelServer,
  isLocalModelServerReachable,
} from './ai/endpointPolicy';

/**
 * Generates an embedding vector for semantic retrieval. Returns `null` on any
 * failure (fail-closed): an empty vector would silently poison retrieval, so
 * callers treat a null as "cannot retrieve / cannot store this chunk".
 *
 * Ollama is strictly opt-in (ADR-009). No request is made unless the learner
 * explicitly enabled local AI, a non-empty server URL is configured, the web
 * runtime rule permits that URL, and a short reachability probe succeeds.
 * There is no fetch at module load or import time.
 */
export const generateEmbedding = async (
  text: string
): Promise<number[] | null> => {
  try {
    const { aiMode, ollamaUrl, ollamaEmbeddingModel } = useSettingsStore.getState();
    if (!canUseLocalModelServer(ollamaUrl, aiMode)) {
      return null;
    }
    const base = normalizeOllamaUrl(ollamaUrl);
    if (!base || !(await isLocalModelServerReachable(base))) {
      return null;
    }
    const endpoint = `${base}/api/embeddings`;
    const res = await fetch(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: resolveOllamaModel('embedding', ollamaEmbeddingModel),
          prompt: text
        })
      }
    );

    if (!res.ok) {
      console.error('[EMBEDDING ERROR] HTTP', res.status);
      return null;
    }

    const data = await res.json();

    const embedding = data.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return null;
    }
    return embedding as number[];

  } catch (err) {
    console.error('[EMBEDDING ERROR]', err);
    return null;
  }
};
