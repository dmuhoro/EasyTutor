/**
 * ADAPTIVE PRELOADER
 *
 * Adaptively preloads content based on predictions and performance.
 * Learns from usage patterns to optimize preload decisions.
 */

import { OfflineLessonCache } from '../offline/offlineLessonCache';
import { OfflineQuizCache } from '../offline/offlineQuizCache';
import { OfflineReasoningCache } from '../offline/offlineReasoningCache';

export interface PreloadDecision {
  content_id: string;
  content_type: 'lesson' | 'quiz' | 'reasoning';
  priority: number;
  estimated_benefit: number;
  preload_probability: number;
}

export class AdaptivePreloader {
  private lessonCache = new OfflineLessonCache();
  private quizCache = new OfflineQuizCache();
  private reasoningCache = new OfflineReasoningCache();

  private readonly MAX_CONCURRENT_PRELOADS = 3;
  private readonly PRELOAD_TIMEOUT = 30000; // 30 seconds

  private activePreloads = new Set<string>();
  private preloadHistory: Array<{
    content_id: string;
    content_type: string;
    preload_time: number;
    access_time?: number;
    benefit_score: number;
  }> = [];

  async preloadContent(prefetchPlan: {
    recommendations: Array<{
      type: 'lesson' | 'quiz' | 'reasoning';
      canonical_id: string;
      priority: number;
    }>;
  }): Promise<{
    preloaded: number;
    skipped: number;
    failed: number;
  }> {
    let preloaded = 0;
    let skipped = 0;
    let failed = 0;

    // Sort by priority
    const sortedRecommendations = prefetchPlan.recommendations
      .sort((a, b) => b.priority - a.priority);

    // Preload in batches to avoid overwhelming the network
    for (let i = 0; i < sortedRecommendations.length; i += this.MAX_CONCURRENT_PRELOADS) {
      const batch = sortedRecommendations.slice(i, i + this.MAX_CONCURRENT_PRELOADS);

      const batchPromises = batch.map(async (rec) => {
        const decision = await this.makePreloadDecision(rec);

        if (decision.preload_probability < 0.5) {
          skipped++;
          return;
        }

        if (this.activePreloads.has(rec.canonical_id)) {
          skipped++;
          return;
        }

        try {
          this.activePreloads.add(rec.canonical_id);
          const startTime = Date.now();

          await this.executePreload(rec);

          this.preloadHistory.push({
            content_id: rec.canonical_id,
            content_type: rec.type,
            preload_time: Date.now() - startTime,
            benefit_score: decision.estimated_benefit,
          });

          preloaded++;
        } catch (error) {
          console.warn(`Failed to preload ${rec.canonical_id}:`, error);
          failed++;
        } finally {
          this.activePreloads.delete(rec.canonical_id);
        }
      });

      await Promise.allSettled(batchPromises);

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { preloaded, skipped, failed };
  }

  private async makePreloadDecision(recommendation: {
    type: 'lesson' | 'quiz' | 'reasoning';
    canonical_id: string;
    priority: number;
  }): Promise<PreloadDecision> {
    // Check if already cached
    const isCached = await this.isContentCached(recommendation);
    if (isCached) {
      return {
        content_id: recommendation.canonical_id,
        content_type: recommendation.type,
        priority: recommendation.priority,
        estimated_benefit: 0,
        preload_probability: 0,
      };
    }

    // Calculate estimated benefit based on priority and history
    const historicalBenefit = this.getHistoricalBenefit(recommendation.canonical_id);
    const estimatedBenefit = (recommendation.priority + historicalBenefit) / 2;

    // Calculate preload probability based on various factors
    const probability = this.calculatePreloadProbability(recommendation, estimatedBenefit);

    return {
      content_id: recommendation.canonical_id,
      content_type: recommendation.type,
      priority: recommendation.priority,
      estimated_benefit: estimatedBenefit,
      preload_probability: probability,
    };
  }

  private async isContentCached(recommendation: {
    type: 'lesson' | 'quiz' | 'reasoning';
    canonical_id: string;
  }): Promise<boolean> {
    switch (recommendation.type) {
      case 'lesson':
        return (await this.lessonCache.get(recommendation.canonical_id)) !== null;
      case 'quiz':
        return (await this.quizCache.getQuiz(recommendation.canonical_id)) !== null;
      case 'reasoning':
        return (await this.reasoningCache.getReasoning(recommendation.canonical_id)) !== null;
      default:
        return false;
    }
  }

  private getHistoricalBenefit(contentId: string): number {
    const history = this.preloadHistory.filter(h => h.content_id === contentId);

    if (history.length === 0) return 0.5; // Default neutral benefit

    // Calculate average benefit score, weighted by recency
    const weightedSum = history.reduce((sum, item, index) => {
      const weight = Math.pow(0.9, history.length - 1 - index); // More recent = higher weight
      return sum + item.benefit_score * weight;
    }, 0);

    const totalWeight = history.reduce((sum, _, index) => {
      return sum + Math.pow(0.9, history.length - 1 - index);
    }, 0);

    return weightedSum / totalWeight;
  }

  private calculatePreloadProbability(
    recommendation: {
      type: 'lesson' | 'quiz' | 'reasoning';
      canonical_id: string;
      priority: number;
    },
    estimatedBenefit: number
  ): number {
    let probability = estimatedBenefit;

    // Adjust based on content type priority
    const typeMultipliers = {
      lesson: 1.0,
      quiz: 0.8,
      reasoning: 0.6,
    };

    probability *= typeMultipliers[recommendation.type];

    // Adjust based on network conditions (mock)
    const networkQuality = this.getNetworkQuality();
    probability *= networkQuality;

    // Adjust based on battery level (mock)
    const batteryLevel = this.getBatteryLevel();
    if (batteryLevel < 0.2) {
      probability *= 0.5; // Reduce preload probability on low battery
    }

    // Adjust based on available storage (mock)
    const storageAvailable = this.getAvailableStorage();
    if (storageAvailable < 0.1) {
      probability *= 0.3; // Significantly reduce on low storage
    }

    return Math.max(0, Math.min(1, probability));
  }

  private getNetworkQuality(): number {
    // Mock network quality assessment
    // In real implementation, would check actual network conditions
    return 0.8; // Assume good network
  }

  private getBatteryLevel(): number {
    // Mock battery level
    return 0.7; // Assume 70% battery
  }

  private getAvailableStorage(): number {
    // Mock available storage (as fraction of total)
    return 0.6; // Assume 60% storage available
  }

  private async executePreload(recommendation: {
    type: 'lesson' | 'quiz' | 'reasoning';
    canonical_id: string;
  }): Promise<void> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Preload timeout')), this.PRELOAD_TIMEOUT);
    });

    const preloadPromise = this.performPreload(recommendation);

    await Promise.race([preloadPromise, timeoutPromise]);
  }

  private async performPreload(recommendation: {
    type: 'lesson' | 'quiz' | 'reasoning';
    canonical_id: string;
  }): Promise<void> {
    // Mock preload implementation - would fetch from network
    switch (recommendation.type) {
      case 'lesson':
        await this.lessonCache.prefetch(recommendation.canonical_id);
        break;
      case 'quiz':
        await this.quizCache.prefetch(recommendation.canonical_id);
        break;
      case 'reasoning':
        await this.reasoningCache.prefetch(recommendation.canonical_id);
        break;
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
  }

  async adaptToPerformance(actualPerformance: {
    subject_id: string;
    topic_id: string;
    performance: number;
    time_spent: number;
  }): Promise<void> {
    // Update preload history with actual access patterns
    const relevantPreloads = this.preloadHistory.filter(h =>
      h.content_id.includes(actualPerformance.topic_id)
    );

    for (const preload of relevantPreloads) {
      if (!preload.access_time) {
        // Mark as accessed and calculate benefit
        preload.access_time = Date.now();
        preload.benefit_score = this.calculateActualBenefit(preload, actualPerformance);
      }
    }

    // Clean old history (keep last 1000 entries)
    if (this.preloadHistory.length > 1000) {
      this.preloadHistory = this.preloadHistory.slice(-1000);
    }
  }

  private calculateActualBenefit(
    preload: {
      content_id: string;
      preload_time: number;
      access_time?: number;
    },
    performance: {
      performance: number;
      time_spent: number;
    }
  ): number {
    // Benefit is higher if performance is good and preload was useful
    const performanceScore = performance.performance;
    const timeEfficiency = Math.max(0, 1 - (preload.preload_time / 10000)); // Penalize slow preloads

    return (performanceScore + timeEfficiency) / 2;
  }

  async getPreloadAnalytics(): Promise<{
    total_preloads: number;
    average_benefit: number;
    cache_hit_rate: number;
    preload_success_rate: number;
  }> {
    const totalPreloads = this.preloadHistory.length;
    const averageBenefit = totalPreloads > 0
      ? this.preloadHistory.reduce((sum, h) => sum + h.benefit_score, 0) / totalPreloads
      : 0;

    // Mock cache hit rate and success rate
    const cacheHitRate = 0.75;
    const successRate = 0.85;

    return {
      total_preloads: totalPreloads,
      average_benefit: averageBenefit,
      cache_hit_rate: cacheHitRate,
      preload_success_rate: successRate,
    };
  }

  async optimizePreloadStrategy(): Promise<{
    recommended_batch_size: number;
    recommended_timeout: number;
    recommended_priority_threshold: number;
  }> {
    // Analyze preload history to optimize strategy
    const analytics = await this.getPreloadAnalytics();

    // Adjust batch size based on success rate
    const batchSize = analytics.preload_success_rate > 0.8
      ? this.MAX_CONCURRENT_PRELOADS + 1
      : Math.max(1, this.MAX_CONCURRENT_PRELOADS - 1);

    // Adjust timeout based on average preload time
    const avgPreloadTime = this.preloadHistory.length > 0
      ? this.preloadHistory.reduce((sum, h) => sum + h.preload_time, 0) / this.preloadHistory.length
      : this.PRELOAD_TIMEOUT;

    const timeout = Math.max(10000, avgPreloadTime * 2);

    // Adjust priority threshold based on benefit
    const priorityThreshold = Math.max(0.3, analytics.average_benefit - 0.2);

    return {
      recommended_batch_size: batchSize,
      recommended_timeout: timeout,
      recommended_priority_threshold: priorityThreshold,
    };
  }
}