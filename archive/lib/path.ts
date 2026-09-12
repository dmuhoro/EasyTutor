import { getWeakTopics } from './adaptive';

export interface LearningPathItem {
  topicId: string;
  priority: 'high' | 'medium' | 'low';
  mastery: number;
}

/**
 * Generates a personalized learning path based on weak topics.
 * Prioritizes topics with the lowest mastery.
 */
export const generateLearningPath = async (userId: string): Promise<LearningPathItem[]> => {
  try {
    const weak = await getWeakTopics(userId);

    if (!weak || weak.length === 0) {
      console.log('[PATH] No weak topics found, learning path is empty');
      return [];
    }

    const path = weak
      .sort((a, b) => a.mastery_level - b.mastery_level)
      .map((t) => ({
        topicId: t.topic_id,
        priority: t.mastery_level < 30 ? 'high' : 'medium' as any,
        mastery: t.mastery_level
      }));

    console.log('[PATH] Generated learning path', { length: path.length });
    return path;

  } catch (err) {
    console.error('[ERROR] [PATH]', err);
    return [];
  }
};
