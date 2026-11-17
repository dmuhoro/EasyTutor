import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function defaultOllamaUrl(): string {
  // Ollama is strictly opt-in (ADR-009). An empty default means no fetch is
  // attempted until the learner explicitly enables local AI in Settings and
  // supplies a reachable LAN URL. Kept as a function for callers that need the
  // default; it intentionally does not inspect expo-constants any more.
  return '';
}

export type AIMode = 'hosted' | 'local' | 'custom';

interface SettingsState {
  aiMode: AIMode;
  ollamaUrl: string;
  ollamaChatModel: string;
  ollamaEmbeddingModel: string;
  customApiKey: string;
  customProvider: 'groq' | 'openai';
  theme: 'dark' | 'light' | 'system';
  
  setAIMode: (mode: AIMode) => void;
  setOllamaUrl: (url: string) => void;
  setOllamaChatModel: (model: string) => void;
  setOllamaEmbeddingModel: (model: string) => void;
  setCustomApiKey: (key: string) => void;
  setCustomProvider: (provider: 'groq' | 'openai') => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  
  // Legacy support for older components
  useLocalLLM: boolean;
  setUseLocalLLM: (val: boolean) => void;

  // Low-data mode
  lowDataMode: boolean;
  setLowDataMode: (val: boolean) => void;

  // Per-session data-use estimate (KB). Incremented by network-bound features
  // (AI replies, embeddings, cloud sync) so learners can see bandwidth usage.
  dataUseKB: number;
  addDataUseKB: (kb: number) => void;
  resetDataUseKB: () => void;

  // Locale / local context settings. localeCountry is the ISO-3166-1 alpha-2
  // country code (null = global / no country-specific context). localeExamples
  // chooses between local (country-specific) and global examples in AI tutoring.
  localeCountry: string | null;
  localeExamples: 'local' | 'global';
  setLocaleCountry: (country: string | null) => void;
  setLocaleExamples: (val: 'local' | 'global') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      aiMode: 'hosted',
      ollamaUrl: defaultOllamaUrl(), // '' — opt-in only (ADR-009)
      ollamaChatModel: 'qwen2.5:1.5b',
      ollamaEmbeddingModel: 'nomic-embed-text',
      customApiKey: '',
      customProvider: 'groq',
      // Light-first per the Stitch baseline; users can still pick dark or system.
      theme: 'light',

      // Derived legacy state
      useLocalLLM: false,

      // Low-data mode
      lowDataMode: false,

      // Per-session data-use estimate (KB)
      dataUseKB: 0,

      // Locale / local context settings
      localeCountry: null,
      localeExamples: 'global',

      setAIMode: (aiMode) => set({ aiMode, useLocalLLM: aiMode === 'local' }),
      setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),
      setOllamaChatModel: (ollamaChatModel) => set({ ollamaChatModel }),
      setOllamaEmbeddingModel: (ollamaEmbeddingModel) => set({ ollamaEmbeddingModel }),
      setCustomApiKey: (customApiKey) => set({ customApiKey }),
      setCustomProvider: (customProvider) => set({ customProvider }),
      setTheme: (theme) => set({ theme }),
      
      setUseLocalLLM: (val) => set({ 
        useLocalLLM: val, 
        aiMode: val ? 'local' : (get().aiMode === 'local' ? 'hosted' : get().aiMode) 
      }),

      setLowDataMode: (val) => set({ lowDataMode: val }),

      setLocaleCountry: (country) => set({ localeCountry: country }),
      setLocaleExamples: (val) => set({ localeExamples: val }),

      addDataUseKB: (kb) => set((state) => ({ dataUseKB: state.dataUseKB + Math.max(0, kb) })),
      resetDataUseKB: () => set({ dataUseKB: 0 }),
    }),
    {
      name: 'easytutor-settings-v2',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
