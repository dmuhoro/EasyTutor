import { BaseSpecializedAgent } from './baseSpecializedAgent';

export class AssessmentAgent extends BaseSpecializedAgent {
  protected registerCapabilities(): void {
    this.registerCapability({
      description: 'Assesses plan outcomes and evidence quality',
      supported_kinds: ['assessment', 'analysis'],
      offline_capable: true,
    });
  }
}
