import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      aiMode: 'hosted',
      ollamaUrl: 'http://localhost:11434',
      ollamaChatModel: 'deepseek-r1:14b',
      ollamaEmbeddingModel: 'nomic-embed-text',
      customApiKey: '',
      customProvider: 'groq',
      theme: 'dark',
      
      // Derived legacy state
      useLocalLLM: false,
      
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
    }),
    {
      name: 'easytutor-settings-v2',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
