import { RuntimeRequest } from '../../runtime/hybridRuntime';
import {
  AgentExecutionContext,
  AgentGoal,
  AgentRole,
  ExecutionNode,
} from '../agenticContracts';
import { CognitiveAgentKernel } from '../cognitiveAgentKernel';

export abstract class BaseSpecializedAgent extends CognitiveAgentKernel {
  constructor(agent_id: string, role: AgentRole) {
    super(agent_id, role);
  }

  protected async buildRuntimeRequest(
    goal: AgentGoal,
    node: ExecutionNode,
    context: AgentExecutionContext,
  ): Promise<RuntimeRequest> {
    return {
      portal_type: context.portal_type,
      canonical_id: context.canonical_id,
      operation: node.kind === 'retrieval' ? 'retrieval' : node.kind === 'assessment' ? 'reasoning' : 'generation',
      payload: {
        role: this.role,
        goal_id: goal.goal_id,
        goal_title: goal.title,
        node_id: node.node_id,
        node_kind: node.kind,
        node_input: node.input,
        learner_id: context.learner_id,
      },
      constraints: {
        maxLatency: context.execution_budget.max_runtime_ms,
      },
    };
  }
}
