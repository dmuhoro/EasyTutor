/**
 * WEAK POINT PREDICTOR
 *
 * Identifies areas where learners struggle.
 * Predicts potential difficulties before they occur.
 */

export interface WeakPoint {
  topic_id: string;
  risk_level: 'low' | 'medium' | 'high';
  intervention_needed: boolean;
  indicators: string[];
}

export class WeakPointPredictor {
  private readonly RISK_THRESHOLDS = {
    high: 0.4,
    medium: 0.6,
    low: 0.8,
  };

  async identifyWeakPoints(
    learningHistory: Array<{
      subject_id: string;
      topic_id: string;
      performance: number;
      timestamp: string;
    }>,
    currentContext: {
      subject_id: string;
      topic_id: string;
    }
  ): Promise<WeakPoint[]> {
    const weakPoints: WeakPoint[] = [];

    // 1. Analyze historical performance
    const topicPerformance = this.analyzeTopicPerformance(learningHistory);

    // 2. Identify struggling topics
    for (const [topicId, performance] of Object.entries(topicPerformance)) {
      const riskLevel = this.calculateRiskLevel(performance);
      const interventionNeeded = this.needsIntervention(performance, riskLevel);

      if (riskLevel !== 'low' || interventionNeeded) {
        weakPoints.push({
          topic_id: topicId,
          risk_level: riskLevel,
          intervention_needed: interventionNeeded,
          indicators: this.getRiskIndicators(performance),
        });
      }
    }

    // 3. Predict related topic risks
    const relatedRisks = await this.predictRelatedTopicRisks(
      currentContext.topic_id,
      topicPerformance
    );

    weakPoints.push(...relatedRisks);

    return weakPoints.sort((a, b) => {
      const riskOrder = { high: 3, medium: 2, low: 1 };
      return riskOrder[b.risk_level] - riskOrder[a.risk_level];
    });
  }

  private analyzeTopicPerformance(history: Array<{
    subject_id: string;
    topic_id: string;
    performance: number;
    timestamp: string;
  }>): Record<string, {
    average_score: number;
    attempts: number;
    recent_trend: 'improving' | 'declining' | 'stable';
    time_spent: number;
    last_attempt: string;
  }> {
    const analysis: Record<string, any> = {};

    // Group by topic
    const topicGroups = history.reduce((groups, item) => {
      if (!groups[item.topic_id]) {
        groups[item.topic_id] = [];
      }
      groups[item.topic_id].push(item);
      return groups;
    }, {} as Record<string, typeof history>);

    // Analyze each topic
    for (const [topicId, items] of Object.entries(topicGroups)) {
      const scores = items.map(i => i.performance);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Calculate recent trend (last 3 attempts)
      const recentScores = scores.slice(-3);
      const trend = this.calculateTrend(recentScores);

      // Calculate average time spent (mock - would be in real data)
      const avgTimeSpent = 1800; // 30 minutes

      analysis[topicId] = {
        average_score: averageScore,
        attempts: items.length,
        recent_trend: trend,
        time_spent: avgTimeSpent,
        last_attempt: items[items.length - 1].timestamp,
      };
    }

    return analysis;
  }

  private calculateTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 2) return 'stable';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 0.05) return 'improving';
    if (diff < -0.05) return 'declining';
    return 'stable';
  }

  private calculateRiskLevel(performance: {
    average_score: number;
    attempts: number;
    recent_trend: string;
    time_spent: number;
  }): 'low' | 'medium' | 'high' {
    const { average_score, recent_trend, attempts } = performance;

    // High risk if low score and declining trend
    if (average_score < this.RISK_THRESHOLDS.high) {
      if (recent_trend === 'declining') return 'high';
      if (attempts > 3 && average_score < 0.5) return 'high';
    }

    // Medium risk if below medium threshold
    if (average_score < this.RISK_THRESHOLDS.medium) return 'medium';

    // Low risk if above low threshold
    if (average_score >= this.RISK_THRESHOLDS.low) return 'low';

    return 'medium';
  }

  private needsIntervention(
    performance: {
      average_score: number;
      attempts: number;
      recent_trend: string;
    },
    riskLevel: 'low' | 'medium' | 'high'
  ): boolean {
    const { attempts, recent_trend } = performance;

    // Always intervene for high risk
    if (riskLevel === 'high') return true;

    // Intervene if multiple attempts and still struggling
    if (riskLevel === 'medium' && attempts >= 3) return true;

    // Intervene if declining trend
    if (recent_trend === 'declining' && attempts >= 2) return true;

    return false;
  }

  private getRiskIndicators(performance: {
    average_score: number;
    attempts: number;
    recent_trend: string;
    time_spent: number;
  }): string[] {
    const indicators: string[] = [];

    if (performance.average_score < 0.5) {
      indicators.push('Low average performance');
    }

    if (performance.recent_trend === 'declining') {
      indicators.push('Declining performance trend');
    }

    if (performance.attempts > 5 && performance.average_score < 0.7) {
      indicators.push('Multiple attempts with persistent difficulty');
    }

    if (performance.time_spent > 3600) { // 1 hour
      indicators.push('Excessive time spent on topic');
    }

    return indicators;
  }

  private async predictRelatedTopicRisks(
    currentTopicId: string,
    topicPerformance: Record<string, any>
  ): Promise<WeakPoint[]> {
    const relatedRisks: WeakPoint[] = [];

    // Get related topics (prerequisites or follow-ups)
    const relatedTopics = this.getRelatedTopics(currentTopicId);

    for (const relatedTopic of relatedTopics) {
      const performance = topicPerformance[relatedTopic];

      if (performance && performance.average_score < 0.7) {
        relatedRisks.push({
          topic_id: relatedTopic,
          risk_level: 'medium',
          intervention_needed: false,
          indicators: ['Related topic weakness', 'Potential prerequisite gap'],
        });
      }
    }

    return relatedRisks;
  }

  private getRelatedTopics(topicId: string): string[] {
    // Mock related topics - would query knowledge graph
    const topicRelations: Record<string, string[]> = {
      'algebra_basics': ['equations', 'arithmetic'],
      'equations': ['algebra_basics', 'inequalities', 'functions'],
      'functions': ['equations', 'graphs', 'calculus_intro'],
    };

    return topicRelations[topicId] || [];
  }

  async getInterventionRecommendations(weakPoints: WeakPoint[]): Promise<Array<{
    topic_id: string;
    intervention_type: 'remedial' | 'practice' | 'explanation' | 'visual_aid';
    priority: number;
    estimated_time: number;
  }>> {
    const recommendations = [];

    for (const weakPoint of weakPoints) {
      if (weakPoint.intervention_needed) {
        const intervention = this.recommendIntervention(weakPoint);
        recommendations.push({
          topic_id: weakPoint.topic_id,
          ...intervention,
        });
      }
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private recommendIntervention(weakPoint: WeakPoint): {
    intervention_type: 'remedial' | 'practice' | 'explanation' | 'visual_aid';
    priority: number;
    estimated_time: number;
  } {
    const { risk_level, indicators } = weakPoint;

    // High priority for high risk
    const basePriority = risk_level === 'high' ? 0.9 : risk_level === 'medium' ? 0.7 : 0.5;

    // Choose intervention type based on indicators
    if (indicators.includes('Low average performance')) {
      return {
        intervention_type: 'remedial',
        priority: basePriority,
        estimated_time: 1800, // 30 minutes
      };
    }

    if (indicators.includes('Multiple attempts with persistent difficulty')) {
      return {
        intervention_type: 'practice',
        priority: basePriority + 0.1,
        estimated_time: 1200, // 20 minutes
      };
    }

    if (indicators.includes('Declining performance trend')) {
      return {
        intervention_type: 'explanation',
        priority: basePriority,
        estimated_time: 900, // 15 minutes
      };
    }

    return {
      intervention_type: 'practice',
      priority: basePriority,
      estimated_time: 600, // 10 minutes
    };
  }
}