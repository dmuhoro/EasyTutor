import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isCached?: boolean;
}


interface StudyState {
  selectedSubjectId: string | null;
  selectedTopic: string | null;
  chatHistory: Record<string, ChatMessage[]>; // topicId -> messages
  setSelectedSubject: (id: string | null) => void;
  setSelectedTopic: (topic: string | null) => void;
  addMessage: (topicId: string, message: ChatMessage) => void;
  clearMessages: (topicId: string) => void;
  clearSession: () => void;
  // Offline AI queue
  pendingAIRequests: PendingAIRequest[];
  enqueueAIRequest: (req: Omit<PendingAIRequest, 'id' | 'timestamp'>) => void;
  dequeueAIRequest: (id: string) => void;
  clearPendingAIRequests: () => void;
}

export interface PendingAIRequest {
  id: string;
  topicId: string;
  subjectId: string;
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  timestamp: number;
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set) => ({
      selectedSubjectId: null,
      selectedTopic: null,
      chatHistory: {},
      pendingAIRequests: [],
      setSelectedSubject: (id) => set({ selectedSubjectId: id }),
      setSelectedTopic: (topic) => set({ selectedTopic: topic }),
      addMessage: (topicId, message) =>
        set((state) => ({
          chatHistory: {
            ...state.chatHistory,
            [topicId]: [...(state.chatHistory[topicId] || []), message]
          }
        })),
      clearMessages: (topicId) =>
        set((state) => ({
          chatHistory: {
            ...state.chatHistory,
            [topicId]: []
          }
        })),
      clearSession: () =>
        set({
          selectedSubjectId: null,
          selectedTopic: null,
          chatHistory: {},
          pendingAIRequests: [],
        }),
      enqueueAIRequest: (req) =>
        set((state) => ({
          pendingAIRequests: [
            ...state.pendingAIRequests,
            { ...req, id: Date.now().toString(), timestamp: Date.now() }
          ]
        })),
      dequeueAIRequest: (id) =>
        set((state) => ({
          pendingAIRequests: state.pendingAIRequests.filter(r => r.id !== id)
        })),
      clearPendingAIRequests: () => set({ pendingAIRequests: [] }),
    }),
    {
      name: 'easytutor-study-storage-v2', // v2 to avoid conflicts with previous
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
