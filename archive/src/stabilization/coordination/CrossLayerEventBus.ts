import { InfrastructureLayer } from '../stabilizationContracts';

/**
 * CROSS-LAYER EVENT BUS
 * 
 * Provides a decoupled communication channel for services across different 
 * infrastructure layers to broadcast and listen for system-wide events.
 */
export class CrossLayerEventBus {
  private static handlers: Map<string, Array<(payload: any) => void>> = new Map();

  static subscribe(event: string, handler: (payload: any) => void): void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)?.push(handler);
  }

  static publish(event: string, sourceLayer: InfrastructureLayer, payload: any): void {
    console.log(`[EVENT BUS] [${sourceLayer}] Publishing: ${event}`);
    const subscribers = this.handlers.get(event) || [];
    subscribers.forEach(handler => handler(payload));
  }
}
