import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from '../lib/logEvent';
import { Database } from '../src/infrastructure/database';
import { SYSTEM_CONFIG } from '../src/config/registry';
import { PortalType } from '../src/types/canonical';
import { resolveTopicIdOrThrow } from '../lib/resolveTopicId';
import { getLearningPort } from './learningGateway';

export interface QuizScore {
  date: string;
  score: number;
  total: number;
  topic: string;
}

export interface XPEvent {
  value: number;
  timestamp: string;
  source: 'quiz' | 'task' | 'streak';
}

interface ProgressRow {
  subject_id: string;
  topic_id: string;
}

interface QuizSessionRow {
  score: number;
  total: number;
  date: string;
  topic_id: string;
  topics?: { title?: string } | null;
}

interface ProfileStatsRow {
  current_streak?: number | null;
  streak_freezes?: number | null;
  last_active_date?: string | null;
}

export const getLevel = (xp: number): string => {
  const t = SYSTEM_CONFIG.MASTERY.THRESHOLDS;
  if (xp >= t.EXPERT) return 'Expert';
  if (xp >= t.ADVANCED) return 'Advanced';
  if (xp >= t.SCHOLAR) return 'Scholar';
  if (xp >= t.EXPLORER) return 'Explorer';
  return 'Beginner';
};

const portalFromSubjectId = (subjectId: string): PortalType => {
  if (subjectId.startsWith('uni-') || subjectId.startsWith('UNI-')) return 'university';
  if (subjectId.startsWith('sd-') || subjectId.startsWith('KE-')) return 'knowledge_explorer';
  return 'high_school';
};

interface ProgressState {
  userId: string | null;
  topicsStudied: Record<string, string[]>;
  quizScores: QuizScore[];
  studyStreak: number;
  xpTotal: number;
  cloudXPEnabled: boolean;
  streakFreezes: number;
  lastOpenedDate: string;
  xpEvents: XPEvent[];
  
  setUserId: (id: string | null) => void;
  syncFromCloud: () => Promise<void>;
  awardXP: (amount: number, source?: XPEvent['source'], portalType?: PortalType) => Promise<void>;
  markTopicDone: (subjectId: string, topicId: string, topicName: string) => Promise<void>;
  addQuizScore: (score: number, total: number, topic: string, subjectId: string, topicId?: string) => Promise<void>;
  updateStreak: () => Promise<void>;
  syncPendingProgress: () => Promise<void>;
  clearProgress: () => void;
  pendingProgressSync: boolean;
  getLevel: (xp: number) => string;
  getWeeklyXP: () => number;
  awardLoginXP: () => Promise<void>;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      userId: null,
      topicsStudied: {},
      quizScores: [],
      studyStreak: 1,
      xpTotal: 0,
      cloudXPEnabled: true,
      streakFreezes: 1,
      lastOpenedDate: new Date().toISOString().split('T')[0],
      pendingProgressSync: false,
      xpEvents: [],
      
      setUserId: (userId) => {
        const currentId = get().userId;
        if (userId !== currentId) {
          set({ userId, topicsStudied: {}, quizScores: [], studyStreak: 1, xpTotal: 0, cloudXPEnabled: true, streakFreezes: 1, xpEvents: [] });
          if (userId) {
            get().syncFromCloud();
          }
        }
      },

      syncFromCloud: async () => {
        const { userId } = get();
        if (!userId) return;

        try {
          // ENFORCE GOVERNED QUERY (PORTAL ISOLATION)
          const { data: progressData, error: progressError } = await Database.governedQuery({
            table: 'user_progress',
            columns: 'subject_id, topic_id',
            userId,
          });

          if (progressError) {
            logError('PROGRESS_user_progress_fetch_failed', progressError);
          } else {
            const mappedProgress: Record<string, string[]> = {};
            ((progressData ?? []) as unknown as ProgressRow[]).forEach((item) => {
              if (!mappedProgress[item.subject_id]) mappedProgress[item.subject_id] = [];
              mappedProgress[item.subject_id].push(item.topic_id);
            });
            set({ topicsStudied: mappedProgress });
          }

          // 2. Fetch Quiz Sessions (Governed)
          const { data: quizData, error: quizError } = await Database.governedQuery({
            table: 'quiz_sessions',
            columns: 'score, total, date, topic_id, topics(title)',
            userId,
          })
            .order('date', { ascending: false });

          if (quizError) {
            logError('PROGRESS_quiz_sessions_fetch_failed', quizError);
          } else {
            set({ quizScores: ((quizData ?? []) as unknown as QuizSessionRow[]).map((q) => ({
              score: q.score,
              total: q.total,
              date: q.date,
              topic: q.topics?.title || q.topic_id
            })) });
          }

          // 3. Fetch Profile Stats (Governed via Portal Isolation)
          const { data: profile, error: profileError } = await Database.governedQuery({
            table: 'profiles',
            columns: 'current_streak, streak_freezes, last_active_date',
            userId,
          })
            .maybeSingle();

          if (!profileError && profile) {
            const stats = profile as ProfileStatsRow;
            set({ 
              studyStreak: stats.current_streak ?? 1, 
              streakFreezes: stats.streak_freezes ?? 1,
              lastOpenedDate: stats.last_active_date || new Date().toISOString().split('T')[0]
            });
          }
        } catch (err) {
          logError('PROGRESS_syncFromCloud_failed', err);
        }
      },


      awardXP: async (amount, source = 'task', portalType = 'high_school') => {
        const { userId, xpTotal, xpEvents, cloudXPEnabled } = get();
        if (!userId) return;
        if (amount <= 0) return;

        const newXpTotal = xpTotal + amount;
        const newEvent: XPEvent = {
          value: amount,
          timestamp: new Date().toISOString(),
          source
        };

        set({ 
          xpTotal: newXpTotal,
          xpEvents: [...xpEvents, newEvent]
        });

        if (!cloudXPEnabled) return;

        try {
          // Use Database.governedWrite for XP updates
          await Database.governedWrite('profiles', { xp_total: newXpTotal }, { portalType });
        } catch (err) {
          logError('PROFILE_xp_update_failed', err);
          set({ pendingProgressSync: true });
        }
      },

      markTopicDone: async (subjectId, topicId, topicName) => {
        const { userId, topicsStudied } = get();
        if (!userId) return;

        const currentTopics = topicsStudied[subjectId] || [];
        const completionLabel = topicId || topicName;
        if (currentTopics.includes(completionLabel)) return;

        try {
          const resolvedTopicId = await resolveTopicIdOrThrow(topicId || topicName, subjectId);
          const portalType = portalFromSubjectId(subjectId);
          const port = await getLearningPort();
          
          // ROUTE THROUGH ORCHESTRATOR
          await port.markTopicComplete({
            user_id: userId,
            portal_type: portalType,
            subject_id: subjectId,
            topic_id: resolvedTopicId,
            learning_goal: `Mastery of ${resolvedTopicId} in ${subjectId}`,
            mastery_state: { score: 100, attempts: 1, weak_points: [] }
          });

          set({
            topicsStudied: {
              ...get().topicsStudied,
              [subjectId]: [...(get().topicsStudied[subjectId] || []), resolvedTopicId]
            }
          });

          await get().updateStreak();
          await get().awardXP(10, 'task', portalType);
        } catch (err) {
          logError('PROGRESS_user_progress_insert_failed', err);
          set({ pendingProgressSync: true });
          throw err;
        }
      },
        
      addQuizScore: async (score, total, topic, subjectId, topicId) => {
        const { userId } = get();
        if (!userId) return;

        try {
          const resolvedTopicId = await resolveTopicIdOrThrow(topicId || topic, subjectId);
          const portalType = portalFromSubjectId(subjectId);
          const port = await getLearningPort();
          
          // ROUTE THROUGH ORCHESTRATOR
          await port.recordQuizScore({
            user_id: userId,
            portal_type: portalType,
            subject_id: subjectId,
            topic_id: resolvedTopicId,
            learning_goal: `Quiz mastery of ${resolvedTopicId} in ${subjectId}`,
            mastery_state: { score: (score / total) * 100, attempts: 1, weak_points: [] },
            score,
            total
          });

          const newScore = { date: new Date().toISOString(), score, total, topic };
          set({ quizScores: [...get().quizScores, newScore] });

          const percentage = (score / total) * 100;
          const passing = SYSTEM_CONFIG.MASTERY.PASSING_SCORE;
          const xpToAward = percentage >= passing ? 20 : percentage >= 50 ? 10 : 5;
          await get().awardXP(xpToAward, 'quiz', portalType);
          await get().updateStreak();
        } catch (err) {
          logError('PROGRESS_quiz_sessions_insert_failed', err);
          set({ pendingProgressSync: true });
          throw err;
        }
      },

      syncPendingProgress: async () => {
        const { userId, xpTotal, studyStreak, streakFreezes, lastOpenedDate } = get();
        if (!userId || !get().pendingProgressSync) return;

        try {
          await Database.governedWrite('profiles', {
            xp_total: xpTotal,
            current_streak: studyStreak,
            streak_freezes: streakFreezes,
            last_active_date: lastOpenedDate
          }, { portalType: 'high_school' });
          set({ pendingProgressSync: false });
        } catch (err) {
          logError('PROFILE_pending_sync_failed', err);
        }
      },

      updateStreak: async () => {
        const { userId, studyStreak, lastOpenedDate, streakFreezes } = get();
        if (!userId) return;

        const today = new Date().toISOString().split('T')[0];
        if (lastOpenedDate === today) return;

        const lastOpenedTime = new Date(lastOpenedDate).getTime();
        const todayTime = new Date(today).getTime();
        const diffDays = Math.floor((todayTime - lastOpenedTime) / (1000 * 60 * 60 * 24));

        let newStreak = studyStreak;
        let newFreezes = streakFreezes;

        if (diffDays === 1) {
          newStreak += 1;
          await get().awardXP(5, 'streak');
        } else if (diffDays > 1) {
          if (newFreezes > 0) {
            newFreezes -= 1;
          } else {
            newStreak = 1;
          }
        }

        if (newStreak > 0 && newStreak % 7 === 0 && newStreak !== studyStreak) {
          newFreezes += 1;
        }

        set({ 
          studyStreak: newStreak, 
          lastOpenedDate: today, 
          streakFreezes: newFreezes
        });

        try {
          await Database.governedWrite('profiles', {
            current_streak: newStreak,
            last_active_date: today,
            streak_freezes: newFreezes
          }, { portalType: 'high_school' });
        } catch (err) {
          logError('PROFILE_streak_sync_failed', err);
          set({ pendingProgressSync: true });
        }
      },

      clearProgress: () =>
        set({
          topicsStudied: {},
          quizScores: [],
          studyStreak: 1,
          xpTotal: 0,
          streakFreezes: 1,
          lastOpenedDate: new Date().toISOString().split('T')[0],
          xpEvents: []
        }),

      getLevel: (xp) => {
        return getLevel(xp);
      },

      getWeeklyXP: () => {
        const events = get().xpEvents;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        return events
          .filter(e => new Date(e.timestamp) > sevenDaysAgo)
          .reduce((acc, e) => acc + e.value, 0);
      },
      
      awardLoginXP: async () => {
        const { lastOpenedDate } = get();
        const today = new Date().toISOString().split('T')[0];
        if (lastOpenedDate !== today) {
          await get().awardXP(5, 'streak');
        }
      }
    }),
    {
      name: 'easytutor-user-progress-v2', // Bump version for consolidation
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
