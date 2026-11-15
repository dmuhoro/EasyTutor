/**
 * Data Export (Constitution Article II - Data Portability)
 *
 * Allows learners to export all their personal data as a JSON file for
 * download. Includes roadmaps, quiz scores, progress, wrong answers, and
 * profile settings.
 */

import { useProgressStore } from '../../store/progressStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useAuthStore } from '../../store/authStore';
import { useActiveProfileStore } from '../../store/activeProfileStore';

export interface UserDataExport {
  exportedAt: string;
  user: {
    id: string | null;
    email: string | null;
  };
  profile: {
    id: string | null;
    learningMode: string | null;
    onboardingComplete: boolean;
  };
  progress: {
    studyStreak: number;
    xpTotal: number;
    topicsStudied: Record<string, string[]>;
    quizScores: Array<{ date: string; score: number; total: number; topic: string }>;
    wrongAnswers: Array<{
      id: string;
      question: string;
      selectedAnswer: string;
      correctAnswer: string;
      explanation: string;
      topic: string;
      subjectId: string;
      timestamp: string;
    }>;
  };
  roadmaps: Array<{
    id: string;
    topic: string;
    title: string;
    days: Array<{ day: number; title: string; tasks: string[] }>;
    createdAt: string;
  }>;
}

/**
 * Export all user data as a JSON-serializable object.
 */
export const exportUserData = async (): Promise<UserDataExport | null> => {
  const { user } = useAuthStore.getState();
  const {
    userId,
    profileId,
    topicsStudied,
    quizScores,
    wrongAnswers,
    studyStreak,
    xpTotal,
  } = useProgressStore.getState();
  const { roadmaps } = useRoadmapStore.getState();

  if (!userId) return null;

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: userId,
      email: user?.email || null,
    },
    profile: {
      id: profileId || null,
      learningMode: null, // populated from roadmapStore if needed
      onboardingComplete: false,
    },
    progress: {
      studyStreak,
      xpTotal,
      topicsStudied,
      quizScores,
      wrongAnswers,
    },
    roadmaps: roadmaps.map((r) => ({
      id: r.id,
      topic: r.topic,
      title: r.title,
      days: r.days,
      createdAt: r.createdAt,
    })),
  };
};

/**
 * Download user data as a JSON file.
 */
export const downloadUserData = async (): Promise<boolean> => {
  const data = await exportUserData();
  if (!data) return false;

  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const urlObj = new URL(url);
    const filename = `easytutor-data-export-${new Date().toISOString().split('T')[0]}.json`;

    // Create a download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (err) {
    console.error('[DATA EXPORT] Failed:', err);
    return false;
  }
};
