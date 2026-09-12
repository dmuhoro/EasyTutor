import { LearningOrchestrator, OrchestrationResult } from './orchestrator/learningOrchestrator';
export { LearningOrchestrator };
export type { OrchestrationResult };

let _orchestrator: LearningOrchestrator | null = null;
export const getLearningOrchestrator = (): LearningOrchestrator => {
  if (!_orchestrator) {
    _orchestrator = new LearningOrchestrator();
  }
  return _orchestrator;
};

// For backward compatibility while migrating call sites
export const learningOrchestrator = {
  get instance() { return getLearningOrchestrator(); },
  generateLesson: (...args: Parameters<LearningOrchestrator['generateLesson']>) => getLearningOrchestrator().generateLesson(...args),
  assembleQuiz: (...args: Parameters<LearningOrchestrator['assembleQuiz']>) => getLearningOrchestrator().assembleQuiz(...args),
  generateQuizQuestion: (...args: Parameters<LearningOrchestrator['generateQuizQuestion']>) => getLearningOrchestrator().generateQuizQuestion(...args),
  generateRoadmap: (...args: Parameters<LearningOrchestrator['generateRoadmap']>) => getLearningOrchestrator().generateRoadmap(...args),
  progressRoadmap: (...args: Parameters<LearningOrchestrator['progressRoadmap']>) => getLearningOrchestrator().progressRoadmap(...args),
  updateMastery: (...args: Parameters<LearningOrchestrator['updateMastery']>) => getLearningOrchestrator().updateMastery(...args),
  prefetchNext: (...args: Parameters<LearningOrchestrator['prefetchNext']>) => getLearningOrchestrator().prefetchNext(...args),
  markTopicComplete: (...args: Parameters<LearningOrchestrator['markTopicComplete']>) => getLearningOrchestrator().markTopicComplete(...args),
  recordQuizScore: (...args: Parameters<LearningOrchestrator['recordQuizScore']>) => getLearningOrchestrator().recordQuizScore(...args),
  saveRoadmap: (...args: Parameters<LearningOrchestrator['saveRoadmap']>) => getLearningOrchestrator().saveRoadmap(...args),
  saveLearningGoal: (...args: Parameters<LearningOrchestrator['saveLearningGoal']>) => getLearningOrchestrator().saveLearningGoal(...args),
  listLearningGoals: (...args: Parameters<LearningOrchestrator['listLearningGoals']>) => getLearningOrchestrator().listLearningGoals(...args),
} as unknown as LearningOrchestrator;

export * from './runtime/runtimeContext';
export * from './pipelines/adaptiveFlowEngine';
export * from './pipelines/pipelineExecutor';
export * from './pipelines/recommendationEngine';
export * from './mastery/masteryCoordinator';
export * from './prefetch/predictivePrefetcher';
export * from './routing/cloudLLMRouter';
export * from './routing/hybridInferenceRouter';
export * from './routing/localLLMRouter';
export * from './retrieval/index';
export * from './memory/index';
export * from './reasoning/index';
