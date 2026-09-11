import { create } from 'zustand';

export type IngestionStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

export interface IngestionTask {
  id: string;
  fileName: string;
  status: IngestionStatus;
  progress: number; // 0-100
  error?: string;
  chunksTotal?: number;
  chunksProcessed?: number;
}

interface IngestionStore {
  tasks: Record<string, IngestionTask>;
  setTask: (id: string, task: Partial<IngestionTask>) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
}

export const useIngestionStore = create<IngestionStore>((set) => ({
  tasks: {},
  setTask: (id, task) =>
    set((state) => ({
      tasks: {
        ...state.tasks,
        [id]: {
          ...(state.tasks[id] || { id, fileName: 'Unknown', status: 'pending', progress: 0 }),
          ...task,
        },
      },
    })),
  removeTask: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.tasks;
      return { tasks: rest };
    }),
  clearCompleted: () =>
    set((state) => {
      const remaining: Record<string, IngestionTask> = {};
      Object.entries(state.tasks).forEach(([id, task]) => {
        if (task.status !== 'completed') {
          remaining[id] = task;
        }
      });
      return { tasks: remaining };
    }),
}));
