import { Telemetry } from '../../observability/telemetry';
import { AgentMessage, AgentRole, deterministicId } from '../agenticContracts';

export class InterAgentBus {
  private readonly queue: AgentMessage[] = [];

  publish(message: Omit<AgentMessage, 'message_id' | 'created_at'>): AgentMessage {
    const emitted: AgentMessage = {
      ...message,
      message_id: deterministicId(message.correlation_id, message.from, message.to, this.queue.length),
      created_at: new Date().toISOString(),
    };

    if (message.from === message.to) {
      throw new Error('Inter-agent messages must target a distinct role');
    }

    this.queue.push(emitted);

    Telemetry.emit({
      event: 'INTER_AGENT_MESSAGE_PUBLISHED',
      source: 'multiagent',
      portalType: emitted.portal_type,
      operationType: 'INTER_AGENT_BUS',
      payload: emitted as unknown as Record<string, unknown>,
    });

    return emitted;
  }

  drain(role: AgentRole): AgentMessage[] {
    const matches = this.queue.filter((message) => message.to === role);
    const remaining = this.queue.filter((message) => message.to !== role);
    this.queue.length = 0;
    this.queue.push(...remaining);
    return matches;
  }
}
