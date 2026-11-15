/**
 * Data Deletion (Constitution Article II - Right to Erasure)
 *
 * Allows learners to delete all their personal data. This includes local
 * state (Zustand stores) and cloud data (Supabase governed writes).
 */

import { useAuthStore } from '../../store/authStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useProgressStore } from '../../store/progressStore';
import { useActiveProfileStore } from '../../store/activeProfileStore';
import { Database } from '../../src/infrastructure/database';

/**
 * Delete all user data locally and in the cloud.
 */
export const deleteUserData = async (): Promise<boolean> => {
  const { user } = useAuthStore.getState();

  try {
    // 1. Delete cloud data via governed writes (delete from Supabase tables)
    if (user?.id) {
      await deleteCloudData(user.id);
    }

    // 2. Clear all local state
    await clearAllLocalState();

    return true;
  } catch (err) {
    console.error('[DATA DELETION] Failed:', err);
    return false;
  }
};

/**
 * Delete cloud data via governed writes.
 */
async function deleteCloudData(userId: string): Promise<void> {
    const Database = (await import('../../src/infrastructure/database')).Database;

  // Delete roadmaps
  try {
    await Database.governedWrite('cached_roadmaps', { user_id: userId }, { portalType: 'high_school' });
  } catch (err) {
    logError('DATA_DELETION_roadmaps_failed', err);
  }

  // Delete progress
  try {
    await Database.governedWrite('user_progress', { user_id: userId }, { portalType: 'high_school' });
  } catch (err) {
    logError('DATA_DELETION_progress_failed', err);
  }

  // Delete feedback
  try {
    await Database.governedWrite('ai_feedback', { user_id: userId }, { portalType: 'high_school' });
  } catch (err) {
    logError('DATA_DELETION_feedback_failed', err);
  }

  try {
    await Database.governedWrite('user_feedback', { user_id: userId }, { portalType: 'high_school' });
  } catch (err) {
    logError('DATA_DELETION_user_feedback_failed', err);
  }
}

/**
 * Clear all local state (Zustand stores).
 */
async function clearAllLocalState(): Promise<void> {
  const { setActiveProfileId } = useActiveProfileStore.getState();
  const { setUserId, clearProgress } = useProgressStore.getState();
  const { clearRoadmaps, setUserId: setRoadmapUserId } = useRoadmapStore.getState();

  // Clear local state
  setUserId(null);
  setActiveProfileId(null);
  clearRoadmaps();
  clearProgress();
}

import { logError } from '../../lib/logEvent';
