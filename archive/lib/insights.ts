import { getSupabaseClient, logSupabaseError } from './supabaseOps';

/**
 * Computes high-level progress insights for the user.
 */
export const getUserStats = async (userId: string) => {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('user_progress')
      .select('mastery_level')
      .eq('user_id', userId);

    if (error) {
      logSupabaseError('user_progress', 'select', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('[INSIGHTS] no progress data found for user', userId);
      return {
        totalTopics: 0,
        averageMastery: 0
      };
    }

    const total = data.length;
    const avg = data.reduce((sum, t) => sum + (t.mastery_level || 0), 0) / total;

    const stats = {
      totalTopics: total,
      averageMastery: Math.round(avg)
    };

    console.log('[INSIGHTS] computed user stats', stats);
    return stats;

  } catch (err) {
    console.error('[ERROR] [INSIGHTS] FATAL in getUserStats', err);
    return null;
  }
};
