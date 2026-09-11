import { BaseMemoryStore } from './baseMemoryStore';
import { AgentExecutionGovernor } from '../../runtime/agentic/agentExecutionGovernor';

export interface EpisodicMemoryContent {
  event: string;
  reflection?: string;
  context: Record<string, unknown>;
}

export class EpisodicMemoryStore extends BaseMemoryStore<EpisodicMemoryContent> {
  constructor() {
    super(new AgentExecutionGovernor(), 'episodic');
  }
}
