import { BaseSpecializedAgent } from './baseSpecializedAgent';

export class OrchestratorAgent extends BaseSpecializedAgent {
  protected registerCapabilities(): void {
    this.registerCapability({
      description: 'Coordinates multi-agent execution graphs',
      supported_kinds: ['coordination', 'governance', 'analysis'],
      offline_capable: true,
    });
  }
}
