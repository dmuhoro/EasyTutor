import { BaseSpecializedAgent } from './baseSpecializedAgent';

export class MemoryAgent extends BaseSpecializedAgent {
  protected registerCapabilities(): void {
    this.registerCapability({
      description: 'Coordinates governed cognitive memory operations',
      supported_kinds: ['memory', 'analysis'],
      offline_capable: true,
    });
  }
}
