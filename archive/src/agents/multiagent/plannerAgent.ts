import { BaseSpecializedAgent } from './baseSpecializedAgent';

export class PlannerAgent extends BaseSpecializedAgent {
  protected registerCapabilities(): void {
    this.registerCapability({
      description: 'Transforms goals into deterministic execution steps',
      supported_kinds: ['analysis', 'coordination'],
      offline_capable: true,
    });
  }
}
