import { useSettingsStore } from '../store/settingsStore';

const ollamaBase = () =>
  useSettingsStore.getState().ollamaUrl.replace(/\/v1\/?$/, '');

/**
 * Generates an embedding vector for semantic retrieval. Returns `null` on any
 * failure (fail-closed): an empty vector would silently poison retrieval, so
 * callers treat a null as "cannot retrieve / cannot store this chunk".
 */
export const generateEmbedding = async (
  text: string
): Promise<number[] | null> => {
  try {
    const { ollamaModel } = useSettingsStore.getState();
    const endpoint = ollamaBase();
    const res = await fetch(
      `${endpoint}/api/embeddings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: ollamaModel,
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
