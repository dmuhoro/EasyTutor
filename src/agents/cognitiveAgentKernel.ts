import { Telemetry } from '../observability/telemetry';
import { AgentExecutionGovernor } from '../runtime/agentic/agentExecutionGovernor';
import { HybridRuntime } from '../runtime/hybridRuntime';
import { RuntimeRequest } from '../runtime/types';
import {
  AgentExecutionContext,
  AgentGoal,
  AgentRole,
  AgentTaskResult,
  ExecutionNode,
  deterministicId,
} from './agenticContracts';

export interface AgentCapability {
  capability_id: string;
  description: string;
  supported_kinds: readonly ExecutionNode['kind'][];
  offline_capable: boolean;
}

export abstract class CognitiveAgentKernel {
  protected readonly capabilities: AgentCapability[] = [];

  constructor(
    public readonly agent_id: string,
    public readonly role: AgentRole,
    protected readonly hybridRuntime: HybridRuntime = HybridRuntime.getInstance(),
) {
    this.registerCapabilities();
  }

  protected abstract registerCapabilities(): void;

  protected abstract buildRuntimeRequest(
    goal: AgentGoal,
    node: ExecutionNode,
    context: AgentExecutionContext,
  ): Promise<RuntimeRequest>;

  async executeNode(
    goal: AgentGoal,
    node: ExecutionNode,
    context: AgentExecutionContext,
  ): Promise<AgentTaskResult> {
    const request = await this.buildRuntimeRequest(goal, node, context);
    new AgentExecutionGovernor().validateRuntimeRequest(request);

    Telemetry.emit({
      event: 'AGENT_NODE_EXECUTION_STARTED',
      source: 'agent',
      canonicalId: context.canonical_id,
      userId: context.user_id,
      portalType: context.portal_type,
      operationType: `${this.role.toUpperCase()}_${node.kind.toUpperCase()}`,
      payload: {
        agent_id: this.agent_id,
        node_id: node.node_id,
        plan_goal: goal.goal_id,
      },
    });

    const result = await this.hybridRuntime.execute(request);
    const summary = `${this.role} completed ${node.title}`;

    Telemetry.emit({
      event: 'AGENT_NODE_EXECUTION_COMPLETED',
      source: 'agent',
      canonicalId: context.canonical_id,
      userId: context.user_id,
      portalType: context.portal_type,
      operationType: `${this.role.toUpperCase()}_${node.kind.toUpperCase()}`,
      payload: {
        agent_id: this.agent_id,
        node_id: node.node_id,
        success: result.success,
        fallback_used: result.fallback_used ?? false,
      },
    });

    return {
      node_id: node.node_id,
      role: this.role,
      success: result.success,
      summary,
      output: result.result,
      telemetry: result.telemetry as unknown as Record<string, unknown>,
    };
  }

  supports(kind: ExecutionNode['kind']): boolean {
    return this.capabilities.some((capability) => capability.supported_kinds.includes(kind));
  }

  protected registerCapability(capability: Omit<AgentCapability, 'capability_id'>): void {
    this.capabilities.push({
      capability_id: deterministicId(this.role, capability.supported_kinds.join('-')),
      ...capability,
    });
  }
}
