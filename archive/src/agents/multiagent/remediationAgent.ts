import { BaseSpecializedAgent } from './baseSpecializedAgent';

export class RemediationAgent extends BaseSpecializedAgent {
  protected registerCapabilities(): void {
    this.registerCapability({
      description: 'Repairs degraded plans and proposes fallbacks',
      supported_kinds: ['repair', 'analysis'],
      offline_capable: true,
    });
  }
}
