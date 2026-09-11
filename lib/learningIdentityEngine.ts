import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { logSupabaseError } from './supabaseOps';

export type LearnerType = 'secondary' | 'university' | 'self_directed' | 'professional' | 'researcher';
export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'text';

export interface LearningIdentity {
  user_id: string;
  learner_type: LearnerType;
  goals: string[];
  interests: string[];
  preferred_learning_style: LearningStyle;
  target_outcomes: string[];
  created_at: string;
  updated_at: string;
}

const IDENTITY_CACHE_PREFIX = 'learning_identity_cache_v1';

const getCacheKey = (userId: string): string => `${IDENTITY_CACHE_PREFIX}:${userId}`;

/** Retrieves learning identity from cache or remote */
export async function getIdentity(userId: string): Promise<LearningIdentity | null> {
  // Try local first
  try {
    const cached = await AsyncStorage.getItem(getCacheKey(userId));
    if (cached) {
      return JSON.parse(cached) as LearningIdentity;
    }
  } catch { /* best-effort: fall through to fallback */ }

  // Fallback to remote
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('learning_identities')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logSupabaseError('learning_identities', 'select', error);
      return null;
    }

    if (data) {
      const identity = data as LearningIdentity;
      await AsyncStorage.setItem(getCacheKey(userId), JSON.stringify(identity));
      return identity;
    }
  } catch (err) {
    logSupabaseError('learning_identities', 'select', err);
  }

  return null;
}

/** Persists identity locally and remotely */
export async function persistIdentity(identity: LearningIdentity): Promise<void> {
  try {
    await AsyncStorage.setItem(getCacheKey(identity.user_id), JSON.stringify(identity));
  } catch { /* best-effort: fall through to fallback */ }

  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('learning_identities')
      .upsert({
        user_id: identity.user_id,
        learner_type: identity.learner_type,
        goals: identity.goals,
        interests: identity.interests,
        preferred_learning_style: identity.preferred_learning_style,
        target_outcomes: identity.target_outcomes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      logSupabaseError('learning_identities', 'upsert', error);
    }
  } catch (err) {
    logSupabaseError('learning_identities', 'upsert', err);
  }
}

/** Creates a new learning identity */
export async function createIdentity(
  userId: string,
  partialIdentity: Omit<LearningIdentity, 'user_id' | 'created_at' | 'updated_at'>
): Promise<LearningIdentity> {
  const now = new Date().toISOString();
  const identity: LearningIdentity = {
    user_id: userId,
    ...partialIdentity,
    created_at: now,
    updated_at: now,
  };

  await persistIdentity(identity);
  return identity;
}

/** Updates an existing learning identity */
export async function updateIdentity(
  userId: string,
  partialIdentity: Partial<Omit<LearningIdentity, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<LearningIdentity> {
  const existing = await getIdentity(userId);
  const now = new Date().toISOString();

  if (!existing) {
    // If not exists, create with defaults for missing fields
    const identity: LearningIdentity = {
      user_id: userId,
      learner_type: partialIdentity.learner_type || 'self_directed',
      goals: partialIdentity.goals || [],
      interests: partialIdentity.interests || [],
      preferred_learning_style: partialIdentity.preferred_learning_style || 'text',
      target_outcomes: partialIdentity.target_outcomes || [],
      created_at: now,
      updated_at: now,
    };
    await persistIdentity(identity);
    return identity;
  }

  const updated: LearningIdentity = {
    ...existing,
    ...partialIdentity,
    updated_at: now,
  };

  await persistIdentity(updated);
  return updated;
}
