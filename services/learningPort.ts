import { learningOrchestrator } from '../src/intelligence';
import type { LearningPort } from '../src/domain/learning/learningPort';

/**
 * Composition-root adapter: the only place where the store-facing port is
 * bound to the real governed learning orchestrator.
 */
export const learningPort: LearningPort = {
  saveLearningGoal: (input) => learningOrchestrator.saveLearningGoal(input),
  listLearningGoals: (input) => learningOrchestrator.listLearningGoals(input),
  saveRoadmap: (input) => learningOrchestrator.saveRoadmap(input),
  markTopicComplete: (input) => learningOrchestrator.markTopicComplete(input),
  recordQuizScore: (input) => learningOrchestrator.recordQuizScore(input),
};
