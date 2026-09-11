import { BaseSpecializedAgent } from './baseSpecializedAgent';

export class RetrievalAgent extends BaseSpecializedAgent {
  protected registerCapabilities(): void {
    this.registerCapability({
      description: 'Fetches governed context and retrieval evidence',
      supported_kinds: ['retrieval', 'analysis'],
      offline_capable: true,
    });
  }
}
