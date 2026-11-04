import type { PortalType } from '../../types/canonical';

/**
 * The store-facing contract for learning persistence. The store depends on
 * this abstraction only; the concrete orchestrator is injected/lazy-loaded by
 * `store/learningGateway.ts`, so `store/*` never imports `src/intelligence`.
 */
export interface LearningGoalInput {
  user_id: string;
  topic: string;
  portal_type: PortalType;
  data: Record<string, unknown>;
}

export interface LearningGoalRecord {
  topic: string;
  data: Record<string, unknown>;
  created_at?: string;
}

export interface LearningRoadmapInput {
  user_id: string;
  portal_type: PortalType;
  subject_id: string;
  topic_id: string;
  learning_goal: string;
  mastery_state: {
    score: number;
    attempts: number;
    weak_points: readonly string[];
  };
  roadmapData: unknown;
}

export interface TopicCompletionInput {
  user_id: string;
  portal_type: PortalType;
  subject_id: string;
  topic_id: string;
  learning_goal: string;
  mastery_state: {
    score: number;
    attempts: number;
    weak_points: readonly string[];
  };
}

export interface QuizScoreInput extends TopicCompletionInput {
  score: number;
  total: number;
}

export interface LearningPort {
  saveLearningGoal(input: LearningGoalInput): Promise<void>;
  listLearningGoals(input: {
    user_id: string;
    portal_type: PortalType;
  }): Promise<LearningGoalRecord[]>;
  saveRoadmap(input: LearningRoadmapInput): Promise<void>;
  markTopicComplete(input: TopicCompletionInput): Promise<void>;
  recordQuizScore(input: QuizScoreInput): Promise<void>;
}
