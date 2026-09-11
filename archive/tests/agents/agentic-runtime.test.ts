import { describe, expect, it } from 'vitest';
import { AutonomousTutorLoop } from '../../src/agents/autonomy/autonomousTutorLoop';
import { CognitivePlanner } from '../../src/agents/cognitivePlanner';
import { ExecutionStateMachine } from '../../src/agents/executionStateMachine';
import { MemoryConsolidationEngine } from '../../src/agents/memory/memoryConsolidationEngine';
import { AgentExecutionContext, AgentGoal } from '../../src/agents/agenticContracts';

const context: AgentExecutionContext = {
  portal_type: 'high_school',
  learner_id: 'learner-1',
  session_id: 'session-1',
  canonical_id: 'HS-MATH-ALG-001',
  user_id: 'user-1',
  deterministic_seed: 'seed-1',
  telemetry_correlation_id: 'corr-1',
  offline_available: true,
  execution_budget: {
    max_steps: 8,
    max_runtime_ms: 1000,
    max_retries: 2,
    max_memory_reads: 4,
    max_memory_writes: 4,
  },
  governance_tags: ['governed', 'offline-safe'],
  memory_namespace: 'high_school:learner-1',
  state_version: 1,
};

const goal: AgentGoal = {
  goal_id: 'goal-1',
  title: 'Master factoring',
  description: 'Guide the learner through factoring practice',
  success_criteria: ['Explain the concept', 'Verify understanding'],
  priority: 'high',
  horizon: 'session',
};

describe('agentic execution primitives', () => {
  it('produces deterministic plans', () => {
    const planner = new CognitivePlanner();
    const planA = planner.buildPlan(goal, context);
    const planB = planner.buildPlan(goal, context);

    expect(planA.plan_id).toBe(planB.plan_id);
    expect(planA.nodes.map((node) => node.node_id)).toEqual(planB.nodes.map((node) => node.node_id));
  });

  it('promotes runnable nodes in deterministic order', () => {
    const planner = new CognitivePlanner();
    const stateMachine = new ExecutionStateMachine();
    const plan = planner.buildPlan(goal, context);

    const [first] = stateMachine.nextRunnableNodes(plan);
    expect(first.node_id).toBe(plan.nodes[0].node_id);

    first.status = 'completed';
    plan.nodes[1].status = 'ready';

    const [second] = stateMachine.nextRunnableNodes(plan);
    expect(second.node_id).toBe(plan.nodes[1].node_id);
  });

  it('consolidates governed episodic memory into semantic and procedural forms', async () => {
    const engine = new MemoryConsolidationEngine();
    const request = {
      namespace: 'high_school:learner-1',
      portal_type: 'high_school' as const,
      actor_role: 'memory' as const,
      operation: 'write' as const,
      memory_kind: 'episodic' as const,
    };

    await engine['episodic'].put(request, 'event-1', {
      namespace: request.namespace,
      portal_type: request.portal_type,
      learner_id: context.learner_id,
      created_at: new Date().toISOString(),
      importance: 0.8,
      content: {
        event: 'Completed algebra correction loop',
        context: { topic: 'factoring' },
      },
      tags: ['algebra', 'factoring'],
    });

    const result = await engine.consolidate(request, context.learner_id, ['event-1']);
    expect(result.semantic_count).toBeGreaterThan(0);
    expect(result.procedural_count).toBeGreaterThan(0);
    expect(result.compressed_summary).toContain('event-1');
  });

  it('builds an autonomous coaching plan', () => {
    const loop = new AutonomousTutorLoop();
    const result = loop.run(goal, context, 0.68);
    expect(result.evolved_goal.horizon).toBe('session');
    expect(result.coaching_plan.length).toBeGreaterThan(0);
    expect(result.self_improvement_actions.length).toBeGreaterThan(0);
  });
});
