import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from './analytics';
import { buildPortalScopedQuery } from '../src/infrastructure/database/governedQueries';
import { executeGovernedWrite } from '../src/infrastructure/database/governedWrites';
import { portalFromMode } from '../store/roadmapStore';
import { useRoadmapStore } from '../store/roadmapStore';

export interface MasteryRecord {
  subject: string;
  topic: string;
  attempts: number;
  correct_answers: number;
  total_answers: number;
  mastery_percent: number;
  updated_at?: string;
}

/**
 * Classifies mastery into bands for adaptive logic.
 */
export const getMasteryBand = (mastery: number) => {
  if (mastery < 40) return 'weak';
  if (mastery < 70) return 'developing';
  return 'strong';
};

const CACHE_PREFIX = 'mastery_cache_';
const WEAK_THRESHOLD = 50; // Below 50% is weak
const STRONG_THRESHOLD = 80; // 80% and above is strong

export const updateMastery = async (
  userId: string | undefined,
  subject: string,
  topic: string,
  score: number,
  total: number
): Promise<void> => {
  const cacheKey = `${CACHE_PREFIX}${subject}_${topic}`;
  
  try {
    let currentRecord: MasteryRecord = {
      subject,
      topic,
      attempts: 0,
      correct_answers: 0,
      total_answers: 0,
      mastery_percent: 0
    };

    // Try fetching from cache first for current state
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      currentRecord = JSON.parse(cached);
    } else if (supabase && userId) {
      // Fallback to fetching from DB
      const { data, error } = await buildPortalScopedQuery(supabase, {
        table: 'subject_mastery',
        columns: '*',
        portalType: portalFromMode(useRoadmapStore.getState().learningMode ?? 'high_school'),
        userId
      })
      .eq('subject', subject)
      .eq('topic', topic)
      .single();
        
      if (data && !error) {
        currentRecord = data as unknown as MasteryRecord;
      }
    }

    // Update values
    currentRecord.attempts += 1;
    currentRecord.correct_answers += score;
    currentRecord.total_answers += total;
    currentRecord.mastery_percent = Math.round(
      (currentRecord.correct_answers / currentRecord.total_answers) * 100
    );
    currentRecord.updated_at = new Date().toISOString();

    // Track analytics
    track('mastery_updated', {
      subject,
      topic,
      mastery_percent: currentRecord.mastery_percent,
      attempts: currentRecord.attempts
    });

    if (currentRecord.mastery_percent < WEAK_THRESHOLD && currentRecord.attempts >= 2) {
      track('weak_topic_detected', { subject, topic, mastery_percent: currentRecord.mastery_percent });
    }

    // Save to cache
    await AsyncStorage.setItem(cacheKey, JSON.stringify(currentRecord));

    // Save to DB
    if (supabase && userId) {
      try {
        await executeGovernedWrite(supabase, {
          table: 'subject_mastery',
          portalType: portalFromMode(useRoadmapStore.getState().learningMode ?? 'high_school'),
          userId,
          action: 'upsert',
          matchFields: { user_id: userId, subject: currentRecord.subject, topic: currentRecord.topic },
          payload: {
            subject: currentRecord.subject,
            topic: currentRecord.topic,
            attempts: currentRecord.attempts,
            correct_answers: currentRecord.correct_answers,
            total_answers: currentRecord.total_answers,
            mastery_percent: currentRecord.mastery_percent,
            updated_at: currentRecord.updated_at
          }
        });
      } catch (error) {
        console.error('Failed to update subject mastery in DB:', error);
      }
    }
  } catch (err) {
    console.error('updateMastery error:', err);
  }
};

export const getTopicMastery = async (userId: string | undefined, subject: string, topic: string): Promise<MasteryRecord | null> => {
  const cacheKey = `${CACHE_PREFIX}${subject}_${topic}`;
  
  try {
    if (supabase && userId) {
      const { data, error } = await buildPortalScopedQuery(supabase, {
        table: 'subject_mastery',
        columns: '*',
        portalType: portalFromMode(useRoadmapStore.getState().learningMode ?? 'high_school'),
        userId
      })
      .eq('subject', subject)
      .eq('topic', topic)
      .single();
        
      if (data && !error) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        return data as unknown as MasteryRecord;
      }
    }
  } catch { /* best-effort: fall through to fallback */ }

  const cached = await AsyncStorage.getItem(cacheKey);
  return cached ? JSON.parse(cached) : null;
};

export const getSubjectMastery = async (userId: string | undefined, subject: string): Promise<MasteryRecord[]> => {
  try {
    if (supabase && userId) {
      const { data, error } = await buildPortalScopedQuery(supabase, {
        table: 'subject_mastery',
        columns: '*',
        portalType: portalFromMode(useRoadmapStore.getState().learningMode ?? 'high_school'),
        userId
      })
      .eq('subject', subject);
        
      if (data && !error) {
        const records = data as unknown as MasteryRecord[];
        for (const record of records) {
          const cacheKey = `${CACHE_PREFIX}${subject}_${record.topic}`;
          await AsyncStorage.setItem(cacheKey, JSON.stringify(record));
        }
        return records;
      }
    }
  } catch { /* best-effort: fall through to fallback */ }

  // Fallback to parsing all cache keys
  const records: MasteryRecord[] = [];
  try {
    const keys = await AsyncStorage.getAllKeys();
    const relevantKeys = keys.filter(k => k.startsWith(`${CACHE_PREFIX}${subject}_`));
    for (const k of relevantKeys) {
      const item = await AsyncStorage.getItem(k);
      if (item) {
        records.push(JSON.parse(item));
      }
    }
  } catch { /* best-effort: fall through to fallback */ }
  
  return records;
};

export const getWeakTopics = async (userId: string | undefined, subject?: string): Promise<MasteryRecord[]> => {
  try {
    let query = supabase && userId ? buildPortalScopedQuery(supabase, {
      table: 'subject_mastery',
      columns: '*',
      portalType: portalFromMode(useRoadmapStore.getState().learningMode ?? 'high_school'),
      userId
    }).lt('mastery_percent', WEAK_THRESHOLD).gte('attempts', 2) : null;
    
    if (subject && query) {
      query = query.eq('subject', subject);
    }
    
    if (query) {
      const { data, error } = await query;
      if (data && !error) {
        return data as unknown as MasteryRecord[];
      }
    }
  } catch { /* best-effort: fall through to fallback */ }

  // Offline fallback
  const records: MasteryRecord[] = [];
  try {
    const keys = await AsyncStorage.getAllKeys();
    let relevantKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (subject) {
      relevantKeys = keys.filter(k => k.startsWith(`${CACHE_PREFIX}${subject}_`));
    }
    for (const k of relevantKeys) {
      const item = await AsyncStorage.getItem(k);
      if (item) {
        const parsed = JSON.parse(item) as MasteryRecord;
        if (parsed.mastery_percent < WEAK_THRESHOLD && parsed.attempts >= 2) {
          records.push(parsed);
        }
      }
    }
  } catch { /* best-effort: fall through to fallback */ }
  
  return records;
};
