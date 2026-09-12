export interface QuizAttempt {
  topicId: string;
  score: number; // 0-100
  timestamp: string;
}

/**
 * Calculates current mastery level for a topic using exponential decay weighting.
 * Recent attempts have significantly more weight than older ones.
 */
export const calculateMastery = (attempts: QuizAttempt[]): number => {
  if (attempts.length === 0) return 0;

  // Sort by timestamp (newest first)
  const sorted = [...attempts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  let totalWeight = 0;
  let weightedScore = 0;
  
  // Use a decay factor (0.5 means each previous attempt is half as important as the one after it)
  const DECAY = 0.7;

  sorted.forEach((attempt, index) => {
    const weight = Math.pow(DECAY, index);
    weightedScore += attempt.score * weight;
    totalWeight += weight;
  });

  return Math.round(weightedScore / totalWeight);
};

/**
 * Determines if a student is "confused" on a topic based on a negative streak.
 */
export const isUserConfused = (attempts: QuizAttempt[], threshold = 50): boolean => {
  if (attempts.length < 2) return false;

  const sorted = [...attempts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Check if last two attempts were below threshold
  return sorted[0].score < threshold && sorted[1].score < threshold;
};
