/**
 * Shared performance contracts. `trendEngine` needs these shapes, and the
 * performance engine needs the trend recorder; keeping the types in a leaf
 * module removes the `performanceEngine ↔ trendEngine` cycle.
 */
export type FluencyLevel = 'Emerging' | 'Developing' | 'Proficient' | 'Fluent';

export interface PerformanceSessionInput {
  userId?: string;
  subject: string;
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  responseTimesMs: number[];
}

export interface PerformanceSessionSummary {
  accuracy_score: number;
  average_response_time_ms: number;
  fastest_response_time_ms: number;
  slowest_response_time_ms: number;
  confidence_score: number;
  fluency_score: number;
  fluency_level: FluencyLevel;
}

export interface PerformanceProfile extends PerformanceSessionSummary {
  user_id?: string;
  subject: string;
  topic: string;
  session_count: number;
  total_questions_answered: number;
  total_correct_answers: number;
  updated_at: string;
}
