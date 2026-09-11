import AsyncStorage from '@react-native-async-storage/async-storage';
import { Intervention, generateInterventions, prioritizeInterventions, rankNextBestActions } from './interventionEngine';
import { WeaknessPrediction, predictWeaknesses, getWeaknessPredictionStore } from './weaknessPredictionEngine';
import { getDueReviews, getAtRiskKnowledge, RetentionProfileStore, getRetentionStore, RetentionProfile } from './spacedRepetitionEngine';
import { LearningPlan, computeAndPersistLearningPlan } from './learningPlanEngine';
import { LearningIdentity, getIdentity } from './learningIdentityEngine';
import { KnowledgePath, getActiveKnowledgePath, getAllKnowledgeNodes, KnowledgeNode } from './knowledgeGraphEngine';
import { CoachAnalysis, analyzeAndCoach } from './learningCoachEngine';
import { AdaptiveLearningPath, buildAdaptiveLearningPath } from './adaptiveCurriculumEngine';


// New recommendation types for memory health
export type MemoryHealthRecommendation = {
  type: 'review_today' | 'high_risk' | 'retention_warning' | 'upcoming_reviews';
  items: RetentionProfile[];
};

/** Generate memory health recommendations using spaced repetition data */
export async function getMemoryHealthRecommendations(userId: string): Promise<MemoryHealthRecommendation[]> {
  const store = getRetentionStore(userId);
  const due = await getDueReviews(store.fetchAll);
  const atRisk = await getAtRiskKnowledge(store.fetchAll);

  const recommendations: MemoryHealthRecommendation[] = [];

  if (due.length > 0) {
    recommendations.push({ type: 'review_today', items: due });
  }
  if (atRisk.length > 0) {
    recommendations.push({ type: 'high_risk', items: atRisk });
  }
  // Simple retention warning if any item has low retentionScore (<50)
  const retentionWarnings = due.filter(p => p.retentionScore < 50);
  if (retentionWarnings.length > 0) {
    recommendations.push({ type: 'retention_warning', items: retentionWarnings });
  }
  // Upcoming reviews (next 3 days) beyond today
  const now = new Date();
  const upcoming = (await store.fetchAll()).filter(p => {
    const diff = (new Date(p.nextReviewDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 3;
  });
  if (upcoming.length > 0) {
    recommendations.push({ type: 'upcoming_reviews', items: upcoming });
  }

  return recommendations;
}

// Extend buildStudentLearningDashboard to include memory health section

import { getQuestionsByFilter, QuestionBankItem } from './questionBank';
import { getSubjectMastery, getWeakTopics, MasteryRecord } from './mastery';
import { supabase } from './supabase';
import {
  FluencyLevel,
  getAllPerformanceProfiles,
  getResponseFactor,
  PerformanceProfile,
} from './performanceEngine';
import {
  getLearningTrendOverview,
  type LearningTrendOverview,
  type LearningTrendSnapshot,
} from './trendEngine';

export type LearningRecommendationType = 'reinforce' | 'speed_drill' | 'spaced_review' | 'mastery_build';

export interface LearningTopicInsight {
  subject: string;
  topic: string;
  mastery_percent: number;
  accuracy_score: number;
  confidence_score: number;
  fluency_score: number;
  fluency_level: FluencyLevel;
  average_response_time_ms: number;
  fastest_response_time_ms: number;
  slowest_response_time_ms: number;
  strength_score: number;
  insight: string;
}

export interface LearningRecommendation {
  recommendation_key: string;
  subject: string;
  topic: string;
  title: string;
  reason: string;
  action_label: string;
  recommendation_type: LearningRecommendationType;
  priority: number;
  confidence_score: number;
  metadata: Record<string, any>;
}

export interface StudentLearningDashboard {
  /** Optional memory health recommendations */
  memory_health?: MemoryHealthRecommendation[];
  user_id?: string;
  accuracy_score: number;
  confidence_score: number;
  fluency_score: number;
  fluency_level: FluencyLevel;
  average_response_time_ms: number;
  strengths: LearningTopicInsight[];
  weaknesses: LearningTopicInsight[];
  recommendations: LearningRecommendation[];
  trend_overview: LearningTrendOverview | null;
  generated_at: string;
  /** Predicted learning risks */
  learning_risks?: WeaknessPrediction[];
  /** Next best action */
  next_best_action?: Intervention;
  /** Learning Health */
  learning_health_score: number;
  learning_health_classification: string;
  /** Personalized Learning Plan */
  learning_plan?: LearningPlan;
  /** Learning Identity */
  learning_identity?: LearningIdentity | null;
  /** Active Knowledge Path */
  active_knowledge_path?: {
    path: KnowledgePath;
    currentNode: KnowledgeNode | null;
  } | null;
  /** AI Coach Analysis */
  coach_analysis?: CoachAnalysis | null;
  /** Adaptive Learning Path */
  adaptive_learning_path?: AdaptiveLearningPath | null;
}


const LEARNING_DASHBOARD_CACHE_PREFIX = 'learning_dashboard_cache_v1';
const LEARNING_RECOMMENDATIONS_CACHE_PREFIX = 'learning_recommendations_cache_v1';
const LEARNING_RECOMMENDATIONS_TABLE = 'learning_recommendations';

/**
 * Returns up to three recommended topics for the user based on mastery.
 * Priority order:
 *   1️⃣ Weak topics (< 50%)
 *   2️⃣ Medium topics (50% - 79%)
 *   3️⃣ Strong topics (>= 80%)
 * Within each bucket the lowest mastery percent is preferred.
 */
export async function getRecommendedTopics(userId: string, subject: string): Promise<string[]> {
  // Fetch all topic mastery records for the subject
  const topicRecords = await getSubjectMastery(userId, subject);
  if (!topicRecords || topicRecords.length === 0) return [];

  // Assign band priority
  const bandPriority = (mastery: number) => {
    if (mastery < 50) return 1;
    if (mastery < 80) return 2;
    return 3;
  };

  // Sort by band first, then by mastery ascending (weakest first)
  const sorted = topicRecords
    .slice()
    .sort((a, b) => {
      const pa = bandPriority(a.mastery_percent);
      const pb = bandPriority(b.mastery_percent);
      if (pa !== pb) return pa - pb;
      return a.mastery_percent - b.mastery_percent; // lower mastery first
    })
    .map(r => r.topic);

  return sorted.slice(0, 3);
}

/**
 * Returns a set of recommended questions for the given subject based on the top recommended topic.
 * If no recommended topic is available, falls back to a random topic.
 */
export async function getRecommendedQuestions(
  userId: string,
  subject: string,
  count: number = 5
): Promise<QuestionBankItem[]> {
  const recommendedTopics = await getRecommendedTopics(userId, subject);
  const topic = recommendedTopics[0] || 'all';
  // Use difficulty = 'all' for simplicity
  const questions = await getQuestionsByFilter(subject, topic, 'all');
  // Shuffle and take the requested count
  const shuffled = questions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generates a practice plan for the next session.
 * Returns the subject, chosen topic, and an estimated number of questions needed.
 */
export interface PracticePlan {
  subject: string;
  topic: string;
  estimatedQuestions: number;
}

export async function getNextPracticePlan(
  userId: string,
  subject: string,
  count: number = 5
): Promise<PracticePlan | null> {
  const topics = await getRecommendedTopics(userId, subject);
  if (topics.length === 0) return null;
  const chosenTopic = topics[0];
  const questions = await getQuestionsByFilter(subject, chosenTopic, 'all');
  const estimated = Math.min(count, questions.length);
  return {
    subject,
    topic: chosenTopic,
    estimatedQuestions: estimated,
  };
}

const dashboardCacheKey = (userId: string | undefined): string =>
  `${LEARNING_DASHBOARD_CACHE_PREFIX}:${userId ?? 'anon'}`;

const recommendationsCacheKey = (userId: string | undefined): string =>
  `${LEARNING_RECOMMENDATIONS_CACHE_PREFIX}:${userId ?? 'anon'}`;

const average = (values: number[]): number =>
  values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const buildInsightSummary = (profile: PerformanceProfile): string => {
  const responseFactor = getResponseFactor(profile.average_response_time_ms);
  if (profile.accuracy_score >= 80 && responseFactor >= 80) {
    return 'Strong recall and fluent pacing.';
  }
  if (profile.accuracy_score >= 80 && responseFactor < 80) {
    return 'You understand the topic, but recall is still slowing you down.';
  }
  if (profile.accuracy_score < 60 && responseFactor < 60) {
    return 'This topic needs more practice and slower, guided repetition.';
  }
  if (profile.accuracy_score < 60) {
    return 'Accuracy is dropping, so the concept is not yet stable.';
  }
  return 'You are progressing, but there is room to become more automatic.';
};

const convertProfileToInsight = (profile: PerformanceProfile): LearningTopicInsight => {
  const responseFactor = getResponseFactor(profile.average_response_time_ms);
  const strengthScore = clampScore(
    (profile.accuracy_score * 0.4) +
      (profile.confidence_score * 0.35) +
      (responseFactor * 0.25),
  );

  return {
    subject: profile.subject,
    topic: profile.topic,
    mastery_percent: profile.accuracy_score,
    accuracy_score: profile.accuracy_score,
    confidence_score: profile.confidence_score,
    fluency_score: profile.fluency_score,
    fluency_level: profile.fluency_level,
    average_response_time_ms: profile.average_response_time_ms,
    fastest_response_time_ms: profile.fastest_response_time_ms,
    slowest_response_time_ms: profile.slowest_response_time_ms,
    strength_score: strengthScore,
    insight: buildInsightSummary(profile),
  };
};

const convertTrendSnapshotToInsight = (snapshot: LearningTrendSnapshot): LearningTopicInsight => {
  const pseudoProfile: PerformanceProfile = {
    user_id: snapshot.user_id,
    subject: snapshot.subject,
    topic: snapshot.topic,
    session_count: snapshot.session_count,
    total_questions_answered: snapshot.total_questions_answered,
    total_correct_answers: snapshot.total_correct_answers,
    average_response_time_ms: snapshot.average_response_time_ms,
    fastest_response_time_ms: snapshot.fastest_response_time_ms,
    slowest_response_time_ms: snapshot.slowest_response_time_ms,
    accuracy_score: snapshot.accuracy_score,
    confidence_score: snapshot.confidence_score,
    fluency_score: snapshot.fluency_score,
    fluency_level: snapshot.fluency_level,
    updated_at: snapshot.completed_at,
  };

  return convertProfileToInsight(pseudoProfile);
};

const convertMasteryFallbackToInsight = (record: MasteryRecord): LearningTopicInsight => {
  const mastery = clampScore(record.mastery_percent);
  const inferredConfidence = clampScore(record.mastery_percent);
  return {
    subject: record.subject,
    topic: record.topic,
    mastery_percent: mastery,
    accuracy_score: mastery,
    confidence_score: inferredConfidence,
    fluency_score: inferredConfidence,
    fluency_level: mastery <= 40 ? 'Emerging' : mastery <= 60 ? 'Developing' : mastery <= 80 ? 'Proficient' : 'Fluent',
    average_response_time_ms: mastery >= 70 ? 18000 : 28000,
    fastest_response_time_ms: mastery >= 70 ? 12000 : 18000,
    slowest_response_time_ms: mastery >= 70 ? 24000 : 36000,
    strength_score: mastery,
    insight: mastery < 50
      ? 'Mastery is below target, so this topic needs focused review.'
      : 'This topic is ready for reinforcement and spaced review.',
  };
};

const isStrength = (insight: LearningTopicInsight): boolean =>
  insight.accuracy_score >= 80 && insight.confidence_score >= 70 && insight.average_response_time_ms <= 20000;

const isWeakness = (insight: LearningTopicInsight): boolean =>
  insight.accuracy_score < 70 || insight.confidence_score < 65 || insight.average_response_time_ms > 25000;

const getRecommendationType = (insight: LearningTopicInsight): LearningRecommendationType => {
  if (insight.accuracy_score < 60) return 'reinforce';
  if (insight.average_response_time_ms > 25000 && insight.accuracy_score >= 60) return 'speed_drill';
  if (insight.confidence_score < 70) return 'spaced_review';
  return 'mastery_build';
};

const getRecommendationTitle = (insight: LearningTopicInsight): string => {
  if (insight.accuracy_score < 60) return `Rebuild ${insight.topic}`;
  if (insight.average_response_time_ms > 25000) return `Speed up ${insight.topic}`;
  if (insight.confidence_score < 70) return `Reinforce ${insight.topic}`;
  return `Extend ${insight.topic}`;
};

const getRecommendationReason = (insight: LearningTopicInsight): string => {
  if (insight.accuracy_score < 60) {
    return `Accuracy is at ${insight.accuracy_score}%, which means the idea still needs guided practice.`;
  }
  if (insight.average_response_time_ms > 25000) {
    return `You are accurate, but your average response time is ${Math.round(insight.average_response_time_ms / 1000)}s, so recall is not yet automatic.`;
  }
  if (insight.confidence_score < 70) {
    return `Your confidence score is ${insight.confidence_score}%, which suggests the topic needs spaced reinforcement.`;
  }
  return 'You know this topic well, so the next step is to deepen and retain it.';
};

const getActionLabel = (type: LearningRecommendationType): string => {
  switch (type) {
    case 'reinforce':
      return 'Review now';
    case 'speed_drill':
      return 'Do speed drill';
    case 'spaced_review':
      return 'Schedule review';
    case 'mastery_build':
      return 'Push further';
  }
};

const buildRecommendations = (
  insights: LearningTopicInsight[],
): LearningRecommendation[] => {
  return insights.slice(0, 5).map((insight, index) => {
    const recommendationType = getRecommendationType(insight);
    return {
      recommendation_key: `${recommendationType}:${insight.subject}:${insight.topic}`,
      subject: insight.subject,
      topic: insight.topic,
      title: getRecommendationTitle(insight),
      reason: getRecommendationReason(insight),
      action_label: getActionLabel(recommendationType),
      recommendation_type: recommendationType,
      priority: 100 - (insight.strength_score ?? 50) - index,
      confidence_score: insight.confidence_score,
      metadata: {
        mastery_percent: insight.mastery_percent,
        accuracy_score: insight.accuracy_score,
        fluency_level: insight.fluency_level,
        average_response_time_ms: insight.average_response_time_ms,
      },
    };
  });
};

const persistRecommendationsLocally = async (
  userId: string | undefined,
  dashboard: StudentLearningDashboard,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(dashboardCacheKey(userId), JSON.stringify(dashboard));
    await AsyncStorage.setItem(recommendationsCacheKey(userId), JSON.stringify(dashboard.recommendations));
  } catch {
    // Local persistence is best-effort.
  }
};

const persistRecommendationsRemotely = async (
  userId: string | undefined,
  recommendations: LearningRecommendation[],
): Promise<void> => {
  if (!userId || !supabase) return;

  try {
    const { error } = await supabase.from(LEARNING_RECOMMENDATIONS_TABLE).upsert(
      recommendations.map((recommendation) => ({
        user_id: userId,
        recommendation_key: recommendation.recommendation_key,
        subject: recommendation.subject,
        topic: recommendation.topic,
        title: recommendation.title,
        reason: recommendation.reason,
        action_label: recommendation.action_label,
        recommendation_type: recommendation.recommendation_type,
        priority: recommendation.priority,
        confidence_score: recommendation.confidence_score,
        metadata: recommendation.metadata,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id, recommendation_key' },
    );

    if (error) {
      console.error('[RECOMMENDATIONS ERROR] Failed to persist learning recommendations', error);
    }
  } catch (error) {
    console.error('[RECOMMENDATIONS ERROR] Failed to persist learning recommendations', error);
  }
};

export const loadCachedLearningDashboard = async (
  userId: string | undefined,
): Promise<StudentLearningDashboard | null> => {
  try {
    const cached = await AsyncStorage.getItem(dashboardCacheKey(userId));
    return cached ? (JSON.parse(cached) as StudentLearningDashboard) : null;
  } catch {
    return null;
  }
};

export const buildStudentLearningDashboard = async (
  userId: string,
): Promise<StudentLearningDashboard> => {
  const [performanceProfiles, weakMasteryTopics, trendOverview] = await Promise.all([
    getAllPerformanceProfiles(userId),
    getWeakTopics(userId),
    getLearningTrendOverview(userId),
  ]);

  const cached = await loadCachedLearningDashboard(userId);
  if (performanceProfiles.length === 0 && weakMasteryTopics.length === 0 && cached && !trendOverview.latest_snapshot) {
    // Make sure cached plan is preserved or refreshed, but we return early.
    // Ideally we should still fetch the plan, but we'll return cached for now.
    return cached;
  }

  const insightsFromPerformance = performanceProfiles.map(convertProfileToInsight);
  const fallbackWeakInsights = weakMasteryTopics.map(convertMasteryFallbackToInsight);
  const trendFallbackInsight = trendOverview.latest_snapshot ? [convertTrendSnapshotToInsight(trendOverview.latest_snapshot)] : [];

  const mergedInsights = [...insightsFromPerformance, ...trendFallbackInsight];
  for (const fallback of fallbackWeakInsights) {
    if (!mergedInsights.some((item) => item.subject === fallback.subject && item.topic === fallback.topic)) {
      mergedInsights.push(fallback);
    }
  }

  const strengths = mergedInsights
    .filter(isStrength)
    .sort((a, b) => b.strength_score - a.strength_score)
    .slice(0, 3);

  const weaknesses = mergedInsights
    .filter(isWeakness)
    .sort((a, b) => a.strength_score - b.strength_score)
    .slice(0, 4);

  const recommendationBase = weaknesses.length > 0 ? weaknesses : mergedInsights.sort((a, b) => a.strength_score - b.strength_score).slice(0, 3);
  const recommendations = buildRecommendations(recommendationBase);

  const accuracyScore = mergedInsights.length > 0
    ? average(mergedInsights.map((item) => item.accuracy_score))
    : 0;
  const confidenceScore = mergedInsights.length > 0
    ? average(mergedInsights.map((item) => item.confidence_score))
    : 0;
  const fluencyScore = mergedInsights.length > 0
    ? average(mergedInsights.map((item) => item.fluency_score))
    : 0;
  const averageResponseTimeMs = mergedInsights.length > 0
    ? average(mergedInsights.map((item) => item.average_response_time_ms))
    : 0;
  const fluencyLevel: FluencyLevel = fluencyScore <= 40 ? 'Emerging' : fluencyScore <= 60 ? 'Developing' : fluencyScore <= 80 ? 'Proficient' : 'Fluent';

  const memoryHealth = await getMemoryHealthRecommendations(userId);
  // Predict future learning risks
  const learningRisks = await predictWeaknesses(userId);
  // Fetch additional data needed for interventions
  const masteryRecords = await getSubjectMastery(userId, '');
  const retentionStore = getRetentionStore(userId);
  const retentions = await retentionStore.fetchAll();
  // Generate interventions based on predictions and other profiles
  const interventions = generateInterventions({
    mastery: masteryRecords,
    performance: performanceProfiles,
    retention: retentions,
    trend: trendOverview.latest_snapshot ?? null,
    weakness: learningRisks,
  });
  const prioritized = prioritizeInterventions(interventions);
  const nextBest = rankNextBestActions(prioritized);

  // Compute Learning Health Score
  const retentionScoreAvg = retentions.length > 0 ? average(retentions.map(r => r.retentionScore)) : 100;
  let trendMomentum = 50; // Stable
  if (trendOverview.weekly?.stagnation_detected) trendMomentum = 30;
  else if (trendOverview.weekly?.metrics.accuracy_score.direction === 'improving') trendMomentum = 80;
  else if (trendOverview.weekly?.metrics.accuracy_score.direction === 'declining') trendMomentum = 20;

  const learningHealthScore = Math.round(
    accuracyScore * 0.3 +
    confidenceScore * 0.2 +
    retentionScoreAvg * 0.2 +
    fluencyScore * 0.2 +
    trendMomentum * 0.1
  );

  let learningHealthClassification: string;
  if (learningHealthScore < 40) learningHealthClassification = 'Critical';
  else if (learningHealthScore < 60) learningHealthClassification = 'Weak';
  else if (learningHealthScore < 80) learningHealthClassification = 'Stable';
  else if (learningHealthScore < 90) learningHealthClassification = 'Strong';
  else learningHealthClassification = 'Elite';

  // Generate Learning Plan
  const learningPlan = await computeAndPersistLearningPlan(userId);

  // Fetch Identity and Path
  const identity = await getIdentity(userId);
  const path = await getActiveKnowledgePath(userId);
  let activeKnowledgePath = null;
  if (path) {
    const nodes = await getAllKnowledgeNodes();
    activeKnowledgePath = {
      path,
      currentNode: path.current_node_id ? nodes.get(path.current_node_id) || null : null,
    };
  }

  // Generate Coach Analysis
  let coachAnalysis = null;
  try {
    coachAnalysis = await analyzeAndCoach(userId, identity);
  } catch (err) {
    // Log error but don't fail dashboard build
    console.warn('Coach analysis failed:', err);
  }

  // Generate Adaptive Learning Path
  let adaptiveLearningPath = null;
  try {
    adaptiveLearningPath = await buildAdaptiveLearningPath(userId);
  } catch (err) {
    console.warn('Adaptive path generation failed:', err);
  }

  const dashboard: StudentLearningDashboard = {
    user_id: userId,
    accuracy_score: accuracyScore,
    confidence_score: confidenceScore,
    fluency_score: fluencyScore,
    fluency_level: fluencyLevel,
    average_response_time_ms: averageResponseTimeMs,
    strengths,
    weaknesses,
    recommendations,
    trend_overview: trendOverview,
    generated_at: new Date().toISOString(),
    memory_health: memoryHealth,
    learning_risks: learningRisks,
    next_best_action: nextBest[0] ?? undefined,
    learning_health_score: learningHealthScore,
    learning_health_classification: learningHealthClassification,
    learning_plan: learningPlan,
    learning_identity: identity,
    active_knowledge_path: activeKnowledgePath,
    coach_analysis: coachAnalysis,
    adaptive_learning_path: adaptiveLearningPath,
  };

  // Persist dashboard locally (including learning risks)
  await persistRecommendationsLocally(userId, dashboard);

  // Persist learning risks locally and remotely via store
  const riskStore = getWeaknessPredictionStore(userId);
  for (const risk of learningRisks) {
    await riskStore.save(risk);
  }

  await persistRecommendationsRemotely(userId, recommendations);
  return dashboard;
};
