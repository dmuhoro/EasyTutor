import { BaseMemoryStore } from './baseMemoryStore';
import { AgentExecutionGovernor } from '../../runtime/agentic/agentExecutionGovernor';

export interface ProceduralMemoryContent {
  procedure: string;
  trigger: string;
  steps: readonly string[];
}

export class ProceduralMemoryStore extends BaseMemoryStore<ProceduralMemoryContent> {
  constructor() {
    super(new AgentExecutionGovernor(), 'procedural');
  }
}
