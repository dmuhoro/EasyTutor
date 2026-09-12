import { useSettingsStore } from '../store/settingsStore';
import { normalizeOllamaUrl, resolveOllamaModel } from './ollamaModels';

/**
 * Generates an embedding vector for semantic retrieval. Returns `null` on any
 * failure (fail-closed): an empty vector would silently poison retrieval, so
 * callers treat a null as "cannot retrieve / cannot store this chunk".
 *
 * Uses the configured embedding model (ollamaEmbeddingModel, default
 * nomic-embed-text) whose output is 384-dim, matching
 * document_chunks.embedding vector(384).
 */
export const generateEmbedding = async (
  text: string
): Promise<number[] | null> => {
  try {
    const { ollamaUrl, ollamaEmbeddingModel } = useSettingsStore.getState();
    const endpoint = normalizeOllamaUrl(ollamaUrl);
    const res = await fetch(
      `${endpoint}/api/embeddings`,
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
