import { logError } from '../lib/logEvent';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProgressStore } from './progressStore';
import { trackEvent } from '../lib/analytics';
import { Database } from '../src/infrastructure/database';
import { resolveTopicIdOrThrow } from '../lib/resolveTopicId';
import { PortalType } from '../src/types/canonical';
import { learningOrchestrator } from '../src/intelligence';

export interface RoadmapDay {
  day: number;
  title: string;
  tasks: string[];
}

export interface CustomRoadmap {
  id: string;
  topic: string;
  title: string;
  days: RoadmapDay[];
  learningMode?: LearningMode;
  subjectId?: string;
  createdAt: string;
  lastOpenedAt?: string;
  completionStatus?: 'not_started' | 'in_progress' | 'completed';
}

export type LearningMode = 'high_school' | 'university' | 'self_directed';

export const portalFromMode = (mode: LearningMode): PortalType => {
  if (mode === 'university') return 'university';
  if (mode === 'self_directed') return 'knowledge_explorer';
  return 'high_school';
};

interface RoadmapState {
  userId: string | null;
  roadmaps: CustomRoadmap[];
  // topicId -> dayNumber -> taskArray
  checkedTasks: Record<string, Record<number, string[]>>;
  
  learningMode: LearningMode | null;
  onboardingComplete: boolean;
  subjectId: string | null;
  topicId: string | null;
  
  setUserId: (id: string | null) => void;
  addRoadmap: (roadmap: CustomRoadmap) => void;
  upsertRoadmap: (roadmap: CustomRoadmap) => void;
  toggleTask: (roadmapId: string, day: number, task: string) => void;
  removeRoadmap: (roadmapId: string) => void;
  clearRoadmaps: () => void;
  
  setLearningMode: (mode: LearningMode) => void;
  setOnboardingComplete: (val: boolean) => void;
  setSubjectId: (id: string | null) => void;
  setTopicId: (id: string | null) => void;
  markRoadmapOpened: (roadmapId: string) => void;
  
  getRoadmapProgress: (roadmapId: string) => number;
  saveRoadmap: (roadmap: CustomRoadmap, mode: LearningMode) => Promise<void>;
  fetchCachedRoadmap: (subjectId: string, topicId: string) => Promise<CustomRoadmap | null>;
  fetchSavedRoadmaps: () => Promise<void>;
  saveTaskProgressToCloud: (roadmapId: string) => Promise<void>;
  syncQueuedTasks: () => Promise<void>;
  pendingTaskSyncs: string[];
}

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (set, get) => ({
      userId: null,
      roadmaps: [],
      checkedTasks: {},
      
      learningMode: null,
      onboardingComplete: false,
      subjectId: null,
      topicId: null,
      pendingTaskSyncs: [],
      
      setUserId: (userId) => {
        if (userId !== get().userId) {
          set({ userId, roadmaps: [], checkedTasks: {}, onboardingComplete: false, learningMode: null });
        }
      },
      
      setLearningMode: (learningMode) => set({ learningMode }),
      setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
      setSubjectId: (subjectId) => set({ subjectId }),
      setTopicId: (topicId) => set({ topicId }),

      markRoadmapOpened: (roadmapId) => {
        set((state) => ({
          roadmaps: state.roadmaps.map(r => 
            r.id === roadmapId ? { ...r, lastOpenedAt: new Date().toISOString() } : r
          )
        }));
      },

      addRoadmap: (roadmap) => {
        set((state) => ({
          roadmaps: [roadmap, ...state.roadmaps],
          checkedTasks: {
            ...state.checkedTasks,
            [roadmap.id]: {}
          }
        }));
      },

      upsertRoadmap: (roadmap) => {
        set((state) => {
          const exists = state.roadmaps.some((r) => r.id === roadmap.id);
          return {
            roadmaps: exists
              ? state.roadmaps.map((r) => (r.id === roadmap.id ? { ...r, ...roadmap } : r))
              : [roadmap, ...state.roadmaps],
          };
        });
      },

      toggleTask: (roadmapId, day, task) =>
        set((state) => {
          if (!state.userId) return state;
          
          const roadmapProgress = state.checkedTasks[roadmapId] || {};
          const dayTasks = roadmapProgress[day] || [];
          const isChecked = dayTasks.includes(task);
          
          if (!isChecked) {
            useProgressStore.getState().awardXP(5, 'task');
            trackEvent('task_completed', {
              user_id: state.userId,
              learning_mode: state.learningMode,
              roadmapId,
              day,
              task
            });
          }
          
          const newCheckedTasks = {
            ...state.checkedTasks,
            [roadmapId]: {
              ...roadmapProgress,
              [day]: isChecked
                ? dayTasks.filter(t => t !== task)
                : [...dayTasks, task]
            }
          };

          const roadmap = state.roadmaps.find(r => r.id === roadmapId);
          let newStatus = roadmap?.completionStatus || 'not_started';
          
          if (roadmap) {
            const totalTasks = roadmap.days.reduce((acc, d) => acc + d.tasks.length, 0);
            const completedCount = Object.values(newCheckedTasks[roadmapId]).reduce((acc, dt) => acc + dt.length, 0);
            
            if (completedCount === 0) newStatus = 'not_started';
            else if (completedCount === totalTasks) newStatus = 'completed';
            else newStatus = 'in_progress';
          }

          void get().saveTaskProgressToCloud(roadmapId).catch((err) => {
            logError('ROADMAP_task_sync_trigger_failed', err);
          });

          return {
            checkedTasks: newCheckedTasks,
            roadmaps: state.roadmaps.map(r => 
              r.id === roadmapId ? { ...r, completionStatus: newStatus as any } : r
            )
          };
        }),
      
      removeRoadmap: (roadmapId) => {
        set((state) => {
          const { [roadmapId]: _, ...remainingTasks } = state.checkedTasks;
          return {
            roadmaps: state.roadmaps.filter(r => r.id !== roadmapId),
            checkedTasks: remainingTasks
          };
        });
        
        void get().saveTaskProgressToCloud(roadmapId).catch((err) => {
          logError('ROADMAP_remove_sync_trigger_failed', err);
        });
      },
        
      clearRoadmaps: () => set({ roadmaps: [], checkedTasks: {} }),

      getRoadmapProgress: (roadmapId) => {
        const state = get();
        const roadmap = state.roadmaps.find(r => r.id === roadmapId);
        if (!roadmap) return 0;
        
        const totalTasks = roadmap.days.reduce((acc, day) => acc + day.tasks.length, 0);
        if (totalTasks === 0) return 0;
        
        const checkedTasksForRoadmap = state.checkedTasks[roadmapId] || {};
        const completedTasksCount = Object.values(checkedTasksForRoadmap).reduce(
          (acc, dayTasks) => acc + dayTasks.length, 
          0
        );
        
        return Math.round((completedTasksCount / totalTasks) * 100);
      },

      saveRoadmap: async (roadmap, mode) => {
        const { userId, topicId } = get();
        if (!userId) return;
        if (!roadmap.subjectId) {
          throw new Error(
            `[ROADMAP SAVE BLOCKED] "${roadmap.topic}" has no curriculum subject, so it cannot be persisted to the cloud yet. The roadmap stays saved on this device.`
          );
        }

        if (!get().roadmaps.find(r => r.id === roadmap.id)) {
          get().addRoadmap(roadmap);
        }

        try {
          const resolvedTopicId = await resolveTopicIdOrThrow(
            topicId || roadmap.topic,
            roadmap.subjectId
          );
          
          // ROUTE THROUGH ORCHESTRATOR
          await learningOrchestrator.saveRoadmap({
            user_id: userId,
            portal_type: portalFromMode(mode),
            subject_id: roadmap.subjectId,
            topic_id: resolvedTopicId,
            learning_goal: `Roadmap for ${resolvedTopicId} in ${roadmap.subjectId}`,
            mastery_state: { score: 0, attempts: 0, weak_points: [] },
            roadmapData: roadmap
          });
        } catch (err) {
          logError('ROADMAP_saveRoadmap_upsert_failed', err);
          throw err;
        }
      },

      fetchCachedRoadmap: async (subjectId, topicId) => {
        const { userId, learningMode } = get();
        if (!userId) return null;

        try {
          const { data, error } = await Database.governedQuery({
            table: 'cached_roadmaps',
            columns: '*',
            userId,
          })
            .eq('subject_id', subjectId)
            .eq('topic_id', topicId)
            .maybeSingle();

          if (error) {
            logError('ROADMAP_fetchCachedRoadmap_failed', error);
            return null;
          }
          if (!data) return null;

          const item = data as any;
          const cached = item.roadmap_json;
          const roadmap: CustomRoadmap = {
            id: item.id,
            topic: cached.topic || cached.title,
            title: cached.title,
            days: cached.days,
            learningMode: item.learning_mode,
            createdAt: item.created_at
          };

          if (!get().roadmaps.find(r => r.topic === roadmap.topic)) {
            get().addRoadmap(roadmap);
          }

          return roadmap;
        } catch (err) {
          logError('ROADMAP_fetchCachedRoadmap_failed', err);
          return null;
        }
      },

      fetchSavedRoadmaps: async () => {
        const { userId } = get();
        if (!userId) return;

        try {
          const { data, error } = await Database.governedQuery({
            table: 'cached_roadmaps',
            columns: '*',
            userId,
          })
            .order('created_at', { ascending: false });

          if (error) {
            logError('ROADMAP_fetchSavedRoadmaps_failed', error);
            return;
          }
          
          const savedRoadmaps: CustomRoadmap[] = ((data as any[]) || []).map(item => ({
            id: item.id,
            topic: item.roadmap_json.topic || item.roadmap_json.title,
            title: item.roadmap_json.title,
            days: item.roadmap_json.days,
            learningMode: item.learning_mode,
            subjectId: item.subject_id,
            createdAt: item.created_at,
            lastOpenedAt: item.last_opened_at,
            completionStatus: item.completion_status
          }));

          set({ roadmaps: savedRoadmaps });
        } catch (err) {
          logError('ROADMAP_fetchSavedRoadmaps_failed', err);
        }
      },

      saveTaskProgressToCloud: async (roadmapId) => {
        const { userId, checkedTasks, roadmaps, learningMode } = get();
        if (!userId) return;

        const roadmap = roadmaps.find(r => r.id === roadmapId);
        const tasks = checkedTasks[roadmapId] || {};
        
        try {
          await Database.governedWrite('cached_roadmaps', {
            checked_tasks: tasks,
            last_opened_at: roadmap?.lastOpenedAt,
            completion_status: roadmap?.completionStatus
          }, {
            portalType: portalFromMode(learningMode || 'high_school'),
            matchFields: { id: roadmapId, user_id: userId }
          });
          
          set({ pendingTaskSyncs: get().pendingTaskSyncs.filter(id => id !== roadmapId) });
        } catch (err) {
          logError('ROADMAP_Cloud_sync_failed,_queueing', err);
          const currentQueue = get().pendingTaskSyncs;
          if (!currentQueue.includes(roadmapId)) {
            set({ pendingTaskSyncs: [...currentQueue, roadmapId] });
          }
        }
      },

      syncQueuedTasks: async () => {
        const queue = get().pendingTaskSyncs;
        if (queue.length === 0) return;
        
        for (const id of queue) {
          try {
            await get().saveTaskProgressToCloud(id);
          } catch (err) {
            logError('ROADMAP_queued_sync_failed', err);
          }
        }
      },
    }),
    {
      name: 'easytutor-multi-roadmap-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

