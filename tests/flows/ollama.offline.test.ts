import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateStudyRoadmap } from '../../lib/api';
import { useRoadmapStore } from '../../store/roadmapStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetLocalModelReachability } from '../../lib/ai/endpointPolicy';

// Mock Platform as native (ios) so local Ollama path can be tested.
// On web, canUseLocalModelServer() blocks loopback URLs per SPEC T2.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Deterministic local mode: force aiMode 'local' with the LEGACY persisted
// value 'http://localhost:11434/v1' so the test proves URL normalization.
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      aiMode: 'local',
      ollamaUrl: 'http://localhost:11434/v1',
      ollamaChatModel: 'qwen2.5:1.5b',
    }),
  },
}));

const roadmapData = {
  title: 'Quantum Entanglement Roadmap',
  days: Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1}`,
    tasks: ['Read the primer', 'Work two practice problems', 'Summarize key ideas'],
  })),
};

describe('Ollama offline / local-Llama path', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetLocalModelReachability();
    useRoadmapStore.setState({ learningMode: 'self_directed', userId: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('happy path: local Ollama answers on the native /api/chat endpoint (no /v1)', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: any) => {
        urls.push(String(input));
        return {
          ok: true,
          statusText: 'OK',
          json: async () => ({ message: { content: JSON.stringify(roadmapData) } }),
        };
      }),
    );

    const result = await generateStudyRoadmap('Quantum Entanglement', undefined, undefined, undefined, 1);

    expect(result.success).toBe(true);
    expect(result.provider).toBe('local_ollama');
    expect(result.data?.title).toBe('Quantum Entanglement Roadmap');
    // Opt-in reachability probe precedes the chat call; the legacy /v1 suffix
    // is normalized away on both endpoints.
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe('http://localhost:11434/api/tags');
    expect(urls[1]).toBe('http://localhost:11434/api/chat');
    expect(urls[1]).not.toContain('/v1');
  });

  it('sad path: Ollama unreachable surfaces an explicit placeholder provider instead of failing silently', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: any) => {
        urls.push(String(input));
        throw new Error('Network request failed (offline)');
      }),
    );

    const result = await generateStudyRoadmap('Quantum Entanglement', undefined, undefined, undefined, 1);

    // Fail closed at the reachability probe: no chat request is attempted
    // against a server that does not answer.
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('http://localhost:11434/api/tags');
    expect(result.provider).toBe('placeholder');
    expect(result.success).toBe(false);
    expect(result.error).toContain('All active providers failed');
    expect(result.data?.title).toBeDefined();
  });
});