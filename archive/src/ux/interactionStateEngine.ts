/**
 * INTERACTION STATE ENGINE
 * 
 * Manages complex UI states and transitions across vertical products.
 */
export type InteractionStatus = 'idle' | 'loading' | 'submitting' | 'success' | 'error';

export class InteractionStateEngine {
  private static states: Map<string, InteractionStatus> = new Map();

  static setStatus(componentId: string, status: InteractionStatus): void {
    this.states.set(componentId, status);
    console.log(`[UI STATE] Component ${componentId} transitioned to ${status}`);
  }

  static getStatus(componentId: string): InteractionStatus {
    return this.states.get(componentId) || 'idle';
  }
}
