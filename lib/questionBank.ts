import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from './analytics';

export interface QuestionBankItem {
  id: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  created_at?: string;
}

const CACHE_PREFIX = 'qb_cache_';
const CACHE_MAX_ENTRIES = 200;

/** Helper to enforce FIFO eviction on a cache key */
const enforceCacheLimit = async (key: string) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;
    const entries = JSON.parse(raw) as any[];
    if (entries.length > CACHE_MAX_ENTRIES) {
      const trimmed = entries.slice(-CACHE_MAX_ENTRIES);
      await AsyncStorage.setItem(key, JSON.stringify(trimmed));
    }
  } catch {
    // ignore
  }
};

export const getQuestionsBySubject = async (subject: string): Promise<QuestionBankItem[]> => {
  const cacheKey = `${CACHE_PREFIX}subject_${subject}`;
  track('question_bank_started', { scope: 'subject', subject });
  try {
    if (supabase) {
      const { data, error } = await supabase.from('question_bank').select('*').eq('subject', subject);
      if (!error && data && data.length > 0) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        await enforceCacheLimit(cacheKey);
        track('question_bank_completed', { scope: 'subject', subject, count: data.length });
        return data as QuestionBankItem[];
      }
    }
  } catch (err) {
    // log error via analytics (already captured in supabase client)
  }

  // Offline fallback
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as QuestionBankItem[];
    track('question_bank_completed', { scope: 'subject', subject, count: parsed.length, fromCache: true });
    return parsed;
  }
  track('question_bank_completed', { scope: 'subject', subject, count: 0, fromCache: false });
  return [];
};

export const getQuestionsByTopic = async (subject: string, topic: string): Promise<QuestionBankItem[]> => {
  const cacheKey = `${CACHE_PREFIX}topic_${subject}_${topic}`;
  track('question_bank_started', { scope: 'topic', subject, topic });
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .eq('subject', subject)
        .eq('topic', topic);
      if (!error && data && data.length > 0) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        await enforceCacheLimit(cacheKey);
        track('question_bank_completed', { scope: 'topic', subject, topic, count: data.length });
        return data as QuestionBankItem[];
      }
    }
  } catch (err) {
    // handled by supabase logging
  }

  // Cache fallback
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as QuestionBankItem[];
    track('question_bank_completed', { scope: 'topic', subject, topic, count: parsed.length, fromCache: true });
    return parsed;
  }

  // Try derive from subject cache
  const subjectCacheKey = `${CACHE_PREFIX}subject_${subject}`;
  const subjectCached = await AsyncStorage.getItem(subjectCacheKey);
  if (subjectCached) {
    const questions = JSON.parse(subjectCached) as QuestionBankItem[];
    const filtered = questions.filter(q => q.topic === topic);
    track('question_bank_completed', { scope: 'topic', subject, topic, count: filtered.length, fromSubjectCache: true });
    return filtered;
  }

  track('question_bank_completed', { scope: 'topic', subject, topic, count: 0 });
  return [];
};

export const getQuestionsByFilter = async (subject: string, topic?: string, difficulty?: string): Promise<QuestionBankItem[]> => {
  let questions: QuestionBankItem[];

  if (topic && topic !== 'all') {
    questions = await getQuestionsByTopic(subject, topic);
  } else {
    questions = await getQuestionsBySubject(subject);
  }

  if (difficulty && difficulty !== 'all') {
    questions = questions.filter(q => q.difficulty === difficulty);
  }

  return questions;
};

export const getRandomQuestionSet = async (subject: string, topic?: string, difficulty?: string, count: number = 10): Promise<QuestionBankItem[]> => {
  const questions = await getQuestionsByFilter(subject, topic, difficulty);
  if (questions.length <= count) return questions;
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export interface PracticeSessionPayload {
  user_id?: string;
  subject: string;
  topic: string;
  difficulty: string;
  score: number;
}

export const savePracticeSession = async (payload: PracticeSessionPayload) => {
  try {
    if (supabase) {
      const { user_id, ...rest } = payload;
      // Get auth user if user_id not provided
      const userRes = await supabase.auth.getUser();
      const finalUserId = user_id || userRes.data.user?.id;
      
      if (!finalUserId) return; // Need an authenticated user

      const { error } = await supabase.from('practice_sessions').insert({
        user_id: finalUserId,
        ...rest,
        completed_at: new Date().toISOString()
      });
      if (error) {
        console.error('Failed to save practice session:', error);
      }
    }
  } catch (err) {
    // Offline caching of practice sessions could be implemented here
    console.error('savePracticeSession error', err);
  }
};
