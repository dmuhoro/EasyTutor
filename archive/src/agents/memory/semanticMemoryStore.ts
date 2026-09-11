import { BaseMemoryStore } from './baseMemoryStore';
import { AgentExecutionGovernor } from '../../runtime/agentic/agentExecutionGovernor';

export interface SemanticMemoryContent {
  concept: string;
  abstraction: string;
  supporting_events: readonly string[];
}

export class SemanticMemoryStore extends BaseMemoryStore<SemanticMemoryContent> {
  constructor() {
    super(new AgentExecutionGovernor(), 'semantic');
  }
}
