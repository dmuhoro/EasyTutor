import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateEmbedding } from '../../lib/embeddings';
import { useSettingsStore } from '../../store/settingsStore';
import {
  resetLocalModelReachability,
} from '../../lib/ai/endpointPolicy';

// T2 / ADR-009: Ollama is strictly opt-in. No fetch may happen at module load,
// in hosted mode, with an empty URL, or on web against a loopback URL. Only an
// explicit local mode with a reachable LAN server may generate an embedding.
// These tests exercise the real `generateEmbedding` and stub only the network.
describe('Ollama embedding is strictly opt-in', () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];

  beforeEach(() => {
    resetLocalModelReachability();
    urls.length = 0;
    useSettingsStore.setState({
      aiMode: 'hosted',
      ollamaUrl: 'http://localhost:11434',
      ollamaEmbeddingModel: 'nomic-embed-text',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
    resetLocalModelReachability();
  });

  const stubFetch = (reachable: boolean) => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      if (url.endsWith('/api/tags')) {
        return { ok: reachable, status: reachable ? 200 : 503 } as Response;
      }
      if (url.endsWith('/api/embeddings')) {
        return { ok: true, status: 200, json: async () => ({ embedding: [0.1, 0.2, 0.3] }) } as Response;
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;
  };

  it('never fetches in hosted mode even with a legacy persisted loopback URL', async () => {
    stubFetch(true);
    expect(await generateEmbedding('notes')).toBeNull();
    expect(urls).toEqual([]);
  });

  it('never fetches in local mode when the URL is empty', async () => {
    useSettingsStore.setState({ aiMode: 'local', ollamaUrl: '' });
    stubFetch(true);
    expect(await generateEmbedding('notes')).toBeNull();
    expect(urls).toEqual([]);
  });

  it('never fetches on web against a loopback URL even when local mode is enabled', async () => {
    useSettingsStore.setState({ aiMode: 'local', ollamaUrl: 'http://localhost:11434' });
    stubFetch(true);
    expect(await generateEmbedding('notes')).toBeNull();
    expect(urls).toEqual([]);
  });

  it('probes reachability and does not embed when an allowed LAN server is down', async () => {
    useSettingsStore.setState({ aiMode: 'local', ollamaUrl: 'http://192.168.1.20:11434' });
    stubFetch(false);
    expect(await generateEmbedding('notes')).toBeNull();
    expect(urls).toEqual(['http://192.168.1.20:11434/api/tags']);
  });

  it('embeds only when local mode is explicit and an allowed server answers', async () => {
    useSettingsStore.setState({ aiMode: 'local', ollamaUrl: 'http://192.168.1.20:11434' });
    stubFetch(true);
    expect(await generateEmbedding('notes')).toEqual([0.1, 0.2, 0.3]);
    expect(urls).toEqual([
      'http://192.168.1.20:11434/api/tags',
      'http://192.168.1.20:11434/api/embeddings',
    ]);
  });
});
