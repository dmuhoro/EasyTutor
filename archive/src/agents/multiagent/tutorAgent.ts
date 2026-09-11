import { BaseSpecializedAgent } from './baseSpecializedAgent';

export class TutorAgent extends BaseSpecializedAgent {
  protected registerCapabilities(): void {
    this.registerCapability({
      description: 'Delivers guided tutoring responses and learning actions',
      supported_kinds: ['tutoring', 'analysis'],
      offline_capable: true,
    });
  }
}
