import { Telemetry } from '../../observability/telemetry';
import { MasteryCoordinator } from '../mastery/masteryCoordinator';
import { AdaptiveFlowEngine } from '../pipelines/adaptiveFlowEngine';
import { PipelineExecutor, PipelineResult } from '../pipelines/pipelineExecutor';
import { GovernedAgentRuntime } from '../../runtime/agentic/governedAgentRuntime';
import { Recommendation, RecommendationEngine } from '../pipelines/recommendationEngine';
import { PredictivePrefetcher, PrefetchResult } from '../prefetch/predictivePrefetcher';
import { RuntimeContext, RuntimeContextInput, createRuntimeContext } from '../runtime/runtimeContext';
import { Database } from '../../infrastructure/database';
import { PortalType } from '../../types/canonical';
import { resolveTopicIdOrThrow } from '../../../lib/resolveTopicId';

export interface OrchestrationResult<T = unknown> {
  context: RuntimeContext;
  pipeline: PipelineResult<T>;
  recommendations: readonly Recommendation[];
  prefetch?: PrefetchResult;
}

export class LearningOrchestrator {
  private readonly governedRuntime = new GovernedAgentRuntime();

  constructor(
    private readonly pipelineExecutor = new PipelineExecutor(undefined, undefined, new GovernedAgentRuntime()),
    private readonly adaptiveFlowEngine = new AdaptiveFlowEngine(pipelineExecutor),
    private readonly masteryCoordinator = new MasteryCoordinator(),
    private readonly recommendationEngine = new RecommendationEngine(),
    private readonly prefetcher = new PredictivePrefetcher(),
  ) {}

  createContext(input: RuntimeContextInput): RuntimeContext {
    return createRuntimeContext(input);
  }

  async generateLesson(input: RuntimeContextInput): Promise<OrchestrationResult> {
    return this.executeSingle('lesson_generation', input, 'LESSON_GENERATED');
  }

  async assembleQuiz(input: RuntimeContextInput): Promise<OrchestrationResult> {
    return this.executeSingle('quiz_generation', input, 'QUIZ_ASSEMBLED');
  }

  async generateQuizQuestion(input: RuntimeContextInput): Promise<OrchestrationResult> {
    return this.executeSingle('quiz_question_generation', input, 'QUIZ_ASSEMBLED');
  }

  async generateRoadmap(input: RuntimeContextInput): Promise<OrchestrationResult> {
    return this.executeSingle('roadmap_adaptation', input, 'ROADMAP_GENERATED');
  }

  async progressRoadmap(input: RuntimeContextInput): Promise<PipelineResult[]> {
    const context = this.createContext(input);
    return this.adaptiveFlowEngine.run(context);
  }

  async updateMastery(input: RuntimeContextInput): Promise<readonly Recommendation[]> {
    const context = this.createContext(input);
    const plan = this.masteryCoordinator.evaluate(context);
    return this.recommendationEngine.recommend(context, plan);
  }

  async prefetchNext(input: RuntimeContextInput): Promise<PrefetchResult> {
    const context = this.createContext(input);
    return this.prefetcher.warm(context);
  }

  async markTopicComplete(input: RuntimeContextInput): Promise<void> {
    const context = this.createContext(input);
    const resolvedTopicId = await resolveTopicIdOrThrow(input.topic_id, input.subject_id);

    await Database.governedWrite('user_progress', {
      subject_id: input.subject_id,
      topic_id: resolvedTopicId
    }, {
      portalType: input.portal_type
    });

    Telemetry.emit({
      event: 'TOPIC_COMPLETED',
      source: 'orchestrator',
      canonicalId: context.canonical_id,
      userId: input.user_id,
      portalType: input.portal_type,
      operationType: 'PROGRESS_UPDATE',
      payload: {
        subject_id: input.subject_id,
        topic_id: resolvedTopicId
      },
    });
  }

  async recordQuizScore(input: RuntimeContextInput & { score: number; total: number }): Promise<void> {
    const context = this.createContext(input);
    const resolvedTopicId = await resolveTopicIdOrThrow(input.topic_id, input.subject_id);

    await Database.governedWrite('quiz_sessions', {
      subject_id: input.subject_id,
      topic_id: resolvedTopicId,
      score: input.score,
      total: input.total,
      date: new Date().toISOString()
    }, {
      portalType: input.portal_type
    });

    Telemetry.emit({
      event: 'QUIZ_COMPLETED',
      source: 'orchestrator',
      canonicalId: context.canonical_id,
      userId: input.user_id,
      portalType: input.portal_type,
      operationType: 'PROGRESS_UPDATE',
      payload: {
        subject_id: input.subject_id,
        topic_id: resolvedTopicId,
        score: input.score,
        total: input.total
      },
    });
  }

  async saveRoadmap(input: RuntimeContextInput & { roadmapData: any }): Promise<void> {
    const context = this.createContext(input);
    const resolvedTopicId = await resolveTopicIdOrThrow(input.topic_id, input.subject_id);

    await Database.governedWrite('cached_roadmaps', {
      user_id: input.user_id,
      topic_id: resolvedTopicId,
      subject_id: input.subject_id,
      roadmap_json: input.roadmapData,
      learning_mode: input.portal_type,
      created_at: new Date().toISOString()
    }, {
      portalType: input.portal_type,
      matchFields: { user_id: input.user_id, topic_id: resolvedTopicId }
    });

    Telemetry.emit({
      event: 'ROADMAP_SAVED',
      source: 'orchestrator',
      canonicalId: context.canonical_id,
      userId: input.user_id,
      portalType: input.portal_type,
      operationType: 'ROADMAP_UPDATE',
      payload: {
        subject_id: input.subject_id,
        topic_id: resolvedTopicId
      },
    });
  }

  // ─── Polymath: free-form learning goals (knowledge_explorer) ──────────────

  /**
   * Persists a free-form ("learn anything") roadmap as a learning goal row,
   * keyed uniquely by (user_id, topic) so writes are idempotent. Only the
   * knowledge_explorer portal may touch this table (fail-closed).
   */
  async saveLearningGoal(input: {
    user_id: string;
    topic: string;
    portal_type: PortalType;
    data: Record<string, unknown>;
  }): Promise<void> {
    if (input.portal_type !== 'knowledge_explorer') {
      throw new Error(
        '[GOVERNANCE ERROR] learning_goals are knowledge-explorer-only; refusing a non-polymath write.'
      );
    }

    await Database.governedWrite('learning_goals', {
      topic: input.topic,
      data: input.data,
    }, {
      portalType: input.portal_type,
      userId: input.user_id,
      matchFields: { user_id: input.user_id, topic: input.topic },
    });

    Telemetry.emit({
      event: 'ROADMAP_SAVED',
      source: 'orchestrator',
      userId: input.user_id,
      portalType: input.portal_type,
      operationType: 'LEARNING_GOAL_SAVED',
      payload: { topic: input.topic },
    });
  }

  /**
   * Lists this user's free-form learning goals for the knowledge_explorer
   * portal so saved missions rehydrate across devices (idempotent local-first).
   */
  async listLearningGoals(input: {
    user_id: string;
    portal_type: PortalType;
  }): Promise<Array<{ topic: string; data: Record<string, unknown>; created_at?: string }>> {
    const { data, error } = await Database.governedQuery({
      table: 'learning_goals',
      columns: 'topic,data,created_at,updated_at',
      userId: input.user_id,
      portalType: input.portal_type,
    }).order('created_at', { ascending: false });

    if (error) {
      throw new Error(`[DB READ FAILURE] [learning_goals] ${error.message}`);
    }

    return (data ?? []) as unknown as Array<{
      topic: string;
      data: Record<string, unknown>;
      created_at?: string;
    }>;
  }

  private async executeSingle(
    kind: Parameters<PipelineExecutor['execute']>[0]['kind'],
    input: RuntimeContextInput,
    event: 'LESSON_GENERATED' | 'QUIZ_ASSEMBLED' | 'PIPELINE_EXECUTED' | 'ROADMAP_GENERATED',
  ): Promise<OrchestrationResult> {
    const start = Date.now();
    const context = this.createContext(input);
    const pipeline = await this.pipelineExecutor.execute({ kind, context });
    const recommendations = this.recommendationEngine.recommend(context, pipeline.mastery_plan);
    const prefetch = await this.prefetcher.warm(context);

    Telemetry.emit({
      event,
      source: 'intelligence',
      canonicalId: context.canonical_id,
      userId: context.user_id,
      portalType: context.portal_type,
      latency: Date.now() - start,
      operationType: `ORCHESTRATOR_${kind.toUpperCase()}`,
      payload: {
        recommendations: recommendations.length,
        prefetch_count: prefetch.staged_count,
        pipeline_latency: pipeline.telemetry.latency,
      },
    });

    return {
      context,
      pipeline,
      recommendations,
      prefetch,
    };
  }
}
