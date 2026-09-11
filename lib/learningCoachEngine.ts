import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { logSupabaseError } from './supabaseOps';
import { LearningIdentity } from './learningIdentityEngine';
import { KnowledgeNode, getAllKnowledgeNodes, getActiveKnowledgePath } from './knowledgeGraphEngine';
import { getSubjectMastery, MasteryRecord } from './mastery';
import { getWeaknessPredictionStore, WeaknessPrediction } from './weaknessPredictionEngine';
import { getLearningTrendOverview, LearningTrendOverview } from './trendEngine';
import { getAllPerformanceProfiles, PerformanceProfile, FluencyLevel } from './performanceEngine';
import { getRetentionStore } from './spacedRepetitionEngine';

export interface LearnerStrength {
  topic: string;
  mastery_percent: number;
  confidence_level: FluencyLevel;
  trend: 'improving' | 'stable' | 'declining';
  reason: string;
}

export interface LearnerWeakness {
  topic: string;
  mastery_percent: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  root_causes: string[];
  impact: string;
}

export interface RootCauseAnalysis {
  cause_type: 'confidence_issue' | 'retention_failure' | 'mastery_gap' | 'trend_decline' | 'prerequisite_gap' | 'behavior_inconsistency';
  topic: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string[];
  impact_score: number; // 0-100
}

export interface CoachingStrategy {
  strategy_type: 'study' | 'review' | 'reinforcement' | 'recovery' | 'acceleration';
  title: string;
  description: string;
  actions: string[];
  estimated_time_mins: number;
  expected_outcome: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface MilestonePredictor {
  topic: string;
  current_mastery: number;
  target_mastery: number;
  estimated_days_to_mastery: number;
  likely_improvement_rate: number; // % per week
  expected_risk_reduction: number; // 0-100
  confidence_percent: number;
  factors: string[];
}

export interface CoachAnalysis {
  user_id: string;
  analysis_date: string;
  learner_identity: LearningIdentity | null;
  learner_state: string;
  strengths: LearnerStrength[];
  weaknesses: LearnerWeakness[];
  root_causes: RootCauseAnalysis[];
  opportunities: string[];
  risks: string[];
  coaching_strategies: CoachingStrategy[];
  milestone_predictions: MilestonePredictor[];
  coaching_summary: string;
  recommendations: string[];
  next_actions: string[];
  learning_health_trajectory: 'improving' | 'stable' | 'declining' | 'critical';
  confidence_in_analysis: number; // 0-100
}

const COACH_ANALYSIS_CACHE = 'learning_coach_analysis_v2';
const COACH_ANALYSIS_TABLE = 'learning_coach_reports';

/** Analyzes learner confidence levels across performance data */
function analyzeConfidence(profiles: PerformanceProfile[], masteryData: MasteryRecord[]): { hasConfidenceIssue: boolean; evidence: string[] } {
  const evidence: string[] = [];
  
  if (profiles.length > 0) {
    const avgConfidence = profiles.reduce((sum, p) => sum + p.confidence_score, 0) / profiles.length;
    const confidentTopics = profiles.filter(p => p.confidence_score >= 70).length;

    if (avgConfidence < 50) {
      evidence.push(`Average confidence score is low at ${avgConfidence.toFixed(0)}/100`);
    }

    if (confidentTopics < profiles.length * 0.3) {
      evidence.push(`Only ${confidentTopics}/${profiles.length} topics have high confidence`);
    }

    // Check for accuracy-confidence mismatch
    const mismatchedTopics = profiles.filter(
      p => p.accuracy_score >= 70 && p.confidence_score < 50
    );
    if (mismatchedTopics.length > 0) {
      evidence.push(
        `${mismatchedTopics.length} topics have high accuracy but low confidence (potential impostor syndrome)`
      );
    }
  }

  return {
    hasConfidenceIssue: evidence.length > 0,
    evidence,
  };
}

/** Analyzes retention and forgetting patterns */
function analyzeRetention(predictions: WeaknessPrediction[]): { hasRetentionIssue: boolean; evidence: string[] } {
  const evidence: string[] = [];
  const highRiskPredictions = predictions.filter(
    p => (p.severity === 'CRITICAL' || p.severity === 'HIGH') && p.reason.includes('decay')
  );

  if (highRiskPredictions.length > 0) {
    evidence.push(`${highRiskPredictions.length} topics are showing signs of knowledge decay`);
    evidence.push(`Highest risk: ${highRiskPredictions[0].topicId}`);
  }

  return {
    hasRetentionIssue: evidence.length > 0,
    evidence,
  };
}

/** Detects mastery gaps - high effort but low results */
function analyzeMasteryGaps(masteryData: MasteryRecord[]): { hasGaps: boolean; evidence: string[] } {
  const evidence: string[] = [];
  const strugglingTopics = masteryData.filter(m => m.attempts >= 5 && m.mastery_percent < 50);

  if (strugglingTopics.length > 0) {
    evidence.push(`Struggling with ${strugglingTopics.length} topics despite multiple attempts`);
    strugglingTopics.slice(0, 2).forEach(t => {
      evidence.push(`${t.topic}: ${t.attempts} attempts with only ${t.mastery_percent}% mastery`);
    });
  }

  return {
    hasGaps: evidence.length > 0,
    evidence,
  };
}

/** Detects negative trends across all metrics */
function analyzeTrendDecline(trends: LearningTrendOverview | null): { hasDecline: boolean; evidence: string[] } {
  const evidence: string[] = [];
  
  if (trends?.weekly?.metrics) {
    const metrics = trends.weekly.metrics;
    if (metrics.accuracy_score?.direction === 'declining') {
      evidence.push(`Accuracy is declining by ${metrics.accuracy_score.decline_percent}% this week`);
    }
    if (metrics.confidence_score?.direction === 'declining') {
      evidence.push(`Confidence is declining by ${metrics.confidence_score.decline_percent}% this week`);
    }
    if (trends.weekly.stagnation_detected) {
      evidence.push(`Learning progress has plateaued for ${trends.weekly.stagnation_streak_days} days`);
    }
  }

  return {
    hasDecline: evidence.length > 0,
    evidence,
  };
}

/** Detects inconsistent study behavior */
function analyzeBehavior(trends: LearningTrendOverview | null): { isInconsistent: boolean; evidence: string[] } {
  const evidence: string[] = [];
  
  if (trends?.weekly) {
    const completionChange = trends.weekly.session_completion_change;
    if (completionChange < -2) {
      evidence.push(`Significant drop in study frequency (${Math.abs(completionChange)} fewer sessions than last week)`);
    }
    if (trends.stagnation_streak_days > 5) {
      evidence.push(`No significant progress recorded in the last ${trends.stagnation_streak_days} days`);
    }
  }

  return {
    isInconsistent: evidence.length > 0,
    evidence,
  };
}

/** Detects prerequisite gaps from knowledge graph */
async function analyzePrerequisiteGaps(
  masteredTopics: Set<string>,
  nodeMap: Map<string, KnowledgeNode>
): Promise<{ hasGaps: boolean; evidence: string[] }> {
  const evidence: string[] = [];

  // Find topics that learner is attempting but lacks prerequisites
  for (const [nodeId, node] of nodeMap) {
    // If not mastered, check if it's an "active" or "attempted" node in some context
    // For now, check all nodes where prerequisites are missing
    const missingPrereqs = node.prerequisites.filter(prereqId => !masteredTopics.has(prereqId));
    if (missingPrereqs.length > 0 && node.difficulty_level > 30) {
      // Only report if this node is likely to be a blocker
      evidence.push(
        `${node.title} requires ${missingPrereqs.length} unmastered prerequisite(s): ${missingPrereqs.slice(0, 2).join(', ')}`
      );
    }
  }

  return {
    hasGaps: evidence.length > 0,
    evidence,
  };
}

/** Generates coaching strategies based on analysis */
function generateCoachingStrategies(
  rootCauses: RootCauseAnalysis[],
  strengths: LearnerStrength[],
  weaknesses: LearnerWeakness[]
): CoachingStrategy[] {
  const strategies: CoachingStrategy[] = [];

  // Study strategy for mastery gaps
  const masteryGaps = rootCauses.filter(c => c.cause_type === 'mastery_gap');
  if (masteryGaps.length > 0) {
    strategies.push({
      strategy_type: 'study',
      title: 'Alternative Learning Approach',
      description: 'You are putting in the effort, but the current method might not be clicking. Let\'s try a different perspective.',
      actions: [
        'Watch a conceptual video on the topic',
        'Try drawing a mind map of the core principles',
        'Solve 3 very simple examples to build intuition',
      ],
      estimated_time_mins: 45,
      expected_outcome: 'Break through the current mastery plateau',
      urgency: 'high',
    });
  }

  // Recovery strategy for high-risk topics
  const criticalWeaknesses = weaknesses.filter(w => w.severity === 'CRITICAL');
  if (criticalWeaknesses.length > 0) {
    strategies.push({
      strategy_type: 'recovery',
      title: 'Immediate Recovery Focus',
      description: `Address ${criticalWeaknesses.length} critical weakness(es) with targeted intervention`,
      actions: criticalWeaknesses.map(
        w => `Complete 2-3 focused practice sessions on ${w.topic} with prerequisites review`
      ),
      estimated_time_mins: criticalWeaknesses.length * 45,
      expected_outcome: `Move ${criticalWeaknesses[0]?.topic || 'weakest topic'} from critical to stable`,
      urgency: 'critical',
    });
  }

  // Review strategy for retention issues
  const retentionCauses = rootCauses.filter(c => c.cause_type === 'retention_failure');
  if (retentionCauses.length > 0) {
    strategies.push({
      strategy_type: 'review',
      title: 'Spaced Review Schedule',
      description: 'Implement spaced repetition to rebuild retention strength and stop knowledge decay.',
      actions: [
        'Review weak topics today',
        'Quick review again after 48 hours',
        'Weekly maintenance sessions',
      ],
      estimated_time_mins: 60,
      expected_outcome: 'Stabilize retention and prevent further score drops',
      urgency: 'high',
    });
  }

  // Acceleration strategy for strong topics
  const strongTopics = strengths.filter(s => s.mastery_percent >= 80 && s.trend === 'improving');
  if (strongTopics.length > 0) {
    strategies.push({
      strategy_type: 'acceleration',
      title: 'Accelerated Learning Path',
      description: `Build on strength in ${strongTopics[0]?.topic} to master advanced concepts`,
      actions: [
        `Explore advanced applications of ${strongTopics[0]?.topic}`,
        'Connect to related topics for broader mastery',
        'Attempt challenging problems to deepen understanding',
      ],
      estimated_time_mins: 90,
      expected_outcome: 'Progress to more advanced topics while maintaining strength',
      urgency: 'low',
    });
  }

  // Reinforcement strategy for medium topics
  const mediumTopics = weaknesses.filter(w => w.severity === 'MEDIUM');
  if (mediumTopics.length > 0) {
    strategies.push({
      strategy_type: 'reinforcement',
      title: 'Targeted Reinforcement',
      description: `Strengthen ${mediumTopics.length} medium-difficulty topic(s)`,
      actions: mediumTopics.map(
        t => `Practice ${t.topic} with varied problem types to build deeper understanding`
      ),
      estimated_time_mins: mediumTopics.length * 30,
      expected_outcome: 'Increase mastery from medium to strong for selected topics',
      urgency: 'medium',
    });
  }

  return strategies.sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
}

/** Predicts future milestones based on current trajectory */
function predictMilestones(
  masteryData: MasteryRecord[],
  trends: LearningTrendOverview | null,
  weaknesses: LearnerWeakness[]
): MilestonePredictor[] {
  const predictions: MilestonePredictor[] = [];

  for (const mastery of masteryData.slice(0, 5)) {
    // Focus on top 5 topics
    const currentMastery = mastery.mastery_percent;
    const targetMastery = 90; // Standard mastery target

    if (currentMastery >= targetMastery) continue;

    // Estimate improvement rate from trends
    let improvementRate = 5; // default: 5% per week
    if (trends?.weekly) {
      const weeklyImprovement = (trends.weekly as any).metrics?.accuracy_score?.improvement_percent;
      if (weeklyImprovement) {
        improvementRate = Math.max(2, weeklyImprovement); 
      }
    }

    const percentToGain = targetMastery - currentMastery;
    const estimatedWeeks = Math.ceil(percentToGain / improvementRate);
    const estimatedDays = estimatedWeeks * 7;

    // Calculate risk reduction
    const isWeakness = weaknesses.some(w => w.topic === mastery.topic);
    const riskReduction = isWeakness ? 40 : 10;

    predictions.push({
      topic: mastery.topic,
      current_mastery: currentMastery,
      target_mastery: targetMastery,
      estimated_days_to_mastery: Math.max(1, estimatedDays),
      likely_improvement_rate: improvementRate,
      expected_risk_reduction: riskReduction,
      confidence_percent: Math.max(30, 100 - estimatedDays * 2), // Confidence decreases over time
      factors: [
        `Current trajectory: ${improvementRate.toFixed(1)}% improvement per week`,
        `${percentToGain.toFixed(0)}% remaining to reach mastery target`,
        estimatedDays > 30 ? 'Long-term goal - requires consistent practice' : 'Near-term goal - achievable with focused effort',
      ],
    });
  }

  return predictions;
}

/** Generates human-readable coaching summary */
function generateCoachingSummary(
  strengths: LearnerStrength[],
  weaknesses: LearnerWeakness[],
  rootCauses: RootCauseAnalysis[],
  trends: LearningTrendOverview | null
): string {
  const lines: string[] = [];

  if (strengths.length > 0) {
    const topStrength = strengths[0];
    lines.push(
      `You're building real strength in ${topStrength.topic} (${topStrength.mastery_percent}% mastery).`
    );
  }

  // Prerequisite gap logic for messages
  const prereqGap = rootCauses.find(c => c.cause_type === 'prerequisite_gap');
  if (prereqGap) {
    lines.push(`You understand ${prereqGap.topic} but your graph shows a prerequisite weakness that needs attention.`);
  }

  if (weaknesses.length > 0) {
    const topWeakness = weaknesses[0];
    const reason = topWeakness.root_causes[0] || 'needs more practice';
    lines.push(
      `${topWeakness.topic} needs focus because ${reason.toLowerCase()}.`
    );
  }

  // Add trend insight
  if (trends?.trend_summary) {
    lines.push(trends.trend_summary);
  }

  // Add root cause insight
  if (rootCauses.length > 0) {
    const criticalCauses = rootCauses.filter(c => c.severity === 'CRITICAL');
    if (criticalCauses.length > 0) {
      lines.push(
        `Priority: Address ${criticalCauses[0].cause_type.replace(/_/g, ' ')} in ${criticalCauses[0].topic}.`
      );
    }
  }

  if (trends?.stagnation_streak_days && trends.stagnation_streak_days > 3) {
    lines.push(`Two review sessions this week could move your learning health from Stable to Strong.`);
  }

  return lines.join(' ');
}

/** Main analysis function */
export async function analyzeAndCoach(userId: string, identity: LearningIdentity | null): Promise<CoachAnalysis> {
  // Fetch all required data
  const [masteryData, performanceProfiles, weaknessPredictions, trendData, nodeMap, activePath] = await Promise.all([
    getSubjectMastery(userId, ''),
    getAllPerformanceProfiles(userId),
    getWeaknessPredictionStore(userId).fetchAll(),
    getLearningTrendOverview(userId),
    getAllKnowledgeNodes(),
    getActiveKnowledgePath(userId),
  ]);

  // Build mastered topics set
  const masteredTopics = new Set(
    masteryData.filter(m => m.mastery_percent >= 80).map(m => m.topic)
  );

  // Detect strengths
  const strengths: LearnerStrength[] = masteryData
    .filter(m => m.mastery_percent >= 70)
    .sort((a, b) => b.mastery_percent - a.mastery_percent)
    .slice(0, 5)
    .map(m => {
      const profile = performanceProfiles.find(p => p.subject === m.subject && p.topic === m.topic);
      let confidenceLevel: FluencyLevel = 'Developing';
      if (profile?.fluency_level) {
        confidenceLevel = profile.fluency_level;
      }

      return {
        topic: m.topic,
        mastery_percent: m.mastery_percent,
        confidence_level: confidenceLevel,
        trend: trendData?.weekly?.metrics?.accuracy_score?.direction === 'improving' ? 'improving' : 'stable',
        reason: `${m.mastery_percent}% mastery demonstrates solid understanding`,
      };
    });

  // Detect weaknesses
  const weaknesses: LearnerWeakness[] = weaknessPredictions
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)
    .map(p => ({
      topic: p.topicId,
      mastery_percent: masteryData.find(m => m.topic === p.topicId)?.mastery_percent || 0,
      severity: p.severity,
      root_causes: [p.reason],
      impact: p.intervention,
    }));

  // Analyze root causes
  const rootCauses: RootCauseAnalysis[] = [];

  const { hasConfidenceIssue, evidence: confidenceEvidence } = analyzeConfidence(performanceProfiles, masteryData);
  if (hasConfidenceIssue) {
    rootCauses.push({
      cause_type: 'confidence_issue',
      topic: weaknesses[0]?.topic || 'general',
      severity: weaknesses[0]?.severity || 'MEDIUM',
      evidence: confidenceEvidence,
      impact_score: 60,
    });
  }

  const { hasRetentionIssue, evidence: retentionEvidence } = analyzeRetention(weaknessPredictions);
  if (hasRetentionIssue) {
    rootCauses.push({
      cause_type: 'retention_failure',
      topic: weaknesses[0]?.topic || 'general',
      severity: weaknesses[0]?.severity || 'MEDIUM',
      evidence: retentionEvidence,
      impact_score: 70,
    });
  }

  const { hasGaps: hasMasteryGaps, evidence: masteryGapEvidence } = analyzeMasteryGaps(masteryData);
  if (hasMasteryGaps) {
    rootCauses.push({
      cause_type: 'mastery_gap',
      topic: masteryData.find(m => m.attempts >= 5 && m.mastery_percent < 50)?.topic || 'various',
      severity: 'HIGH',
      evidence: masteryGapEvidence,
      impact_score: 75,
    });
  }

  const { hasDecline, evidence: declineEvidence } = analyzeTrendDecline(trendData);
  if (hasDecline) {
    rootCauses.push({
      cause_type: 'trend_decline',
      topic: 'overall',
      severity: 'MEDIUM',
      evidence: declineEvidence,
      impact_score: 65,
    });
  }

  const { isInconsistent, evidence: behaviorEvidence } = analyzeBehavior(trendData);
  if (isInconsistent) {
    rootCauses.push({
      cause_type: 'behavior_inconsistency',
      topic: 'general',
      severity: 'MEDIUM',
      evidence: behaviorEvidence,
      impact_score: 55,
    });
  }

  const { hasGaps: hasPrereqGaps, evidence: gapEvidence } = await analyzePrerequisiteGaps(masteredTopics, nodeMap);
  if (hasPrereqGaps && activePath) {
    rootCauses.push({
      cause_type: 'prerequisite_gap',
      topic: activePath.path_goal,
      severity: 'HIGH',
      evidence: gapEvidence,
      impact_score: 80,
    });
  }

  // Opportunities and Risks
  const opportunities = strengths
    .filter(s => s.mastery_percent < 90)
    .map(s => `Perfect your mastery in ${s.topic} to reach 90%+`);
  
  if (activePath) {
    opportunities.push(`Progress towards your goal: ${activePath.path_goal}`);
  }

  const risks = weaknesses
    .filter(w => w.severity === 'CRITICAL' || w.severity === 'HIGH')
    .map(w => `High risk of failure in ${w.topic} due to ${w.root_causes[0]}`);

  // Generate strategies
  const strategies = generateCoachingStrategies(rootCauses, strengths, weaknesses);

  // Predict milestones
  const milestones = predictMilestones(masteryData, trendData, weaknesses);

  // Generate summary
  const coachingSummary = generateCoachingSummary(strengths, weaknesses, rootCauses, trendData);

  // Generate recommendations
  const recommendations = [
    ...strategies.map(s => s.description),
    `Focus on ${weaknesses[0]?.topic || 'foundational concepts'} to improve learning health`,
    `You can reach ${milestones[0]?.topic || 'your goal'} in approximately ${milestones[0]?.estimated_days_to_mastery || 30} days with consistent effort`,
  ];

  // Generate next actions
  const nextActions = strategies.slice(0, 3).flatMap(s => s.actions);

  const analysis: CoachAnalysis = {
    user_id: userId,
    analysis_date: new Date().toISOString(),
    learner_identity: identity,
    learner_state: `${strengths.length} strong topics, ${weaknesses.length} areas for growth`,
    strengths,
    weaknesses,
    root_causes: rootCauses,
    opportunities,
    risks,
    coaching_strategies: strategies,
    milestone_predictions: milestones,
    coaching_summary: coachingSummary,
    recommendations,
    next_actions: nextActions,
    learning_health_trajectory: trendData?.trend_summary?.includes('improving')
      ? 'improving'
      : trendData?.trend_summary?.includes('declining')
      ? 'declining'
      : 'stable',
    confidence_in_analysis: Math.min(95, 50 + masteryData.length * 5), // Higher confidence with more data
  };

  // Persist locally
  await AsyncStorage.setItem(
    `${COACH_ANALYSIS_CACHE}:${userId}`,
    JSON.stringify(analysis)
  );

  // Persist remotely
  if (supabase) {
    try {
      const { error } = await supabase.from(COACH_ANALYSIS_TABLE).upsert({
        user_id: userId,
        analysis_date: analysis.analysis_date,
        coaching_summary: analysis.coaching_summary,
        learner_state: analysis.learner_state,
        strengths: JSON.stringify(analysis.strengths),
        weaknesses: JSON.stringify(analysis.weaknesses),
        root_causes: JSON.stringify(analysis.root_causes),
        opportunities: analysis.opportunities,
        risks: analysis.risks,
        recommendations: analysis.recommendations,
        next_actions: analysis.next_actions,
        learning_health_trajectory: analysis.learning_health_trajectory,
      });

      if (error) {
        logSupabaseError(COACH_ANALYSIS_TABLE, 'upsert', error);
      }
    } catch (err) {
      logSupabaseError(COACH_ANALYSIS_TABLE, 'upsert', err);
    }
  }

  return analysis;
}

/** Retrieve cached analysis */
export async function getCachedCoachAnalysis(userId: string): Promise<CoachAnalysis | null> {
  try {
    const cached = await AsyncStorage.getItem(`${COACH_ANALYSIS_CACHE}:${userId}`);
    if (cached) {
      return JSON.parse(cached) as CoachAnalysis;
    }
  } catch { /* best-effort: fall through to fallback */ }
  return null;
}
