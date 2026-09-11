import { BaseSpecializedAgent } from './baseSpecializedAgent';

export class GovernanceAgent extends BaseSpecializedAgent {
  protected registerCapabilities(): void {
    this.registerCapability({
      description: 'Validates governed actions and portal isolation',
      supported_kinds: ['governance', 'assessment'],
      offline_capable: true,
    });
  }
}
