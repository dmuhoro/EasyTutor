import { HybridRuntime, RuntimeRequest, RuntimeResult } from '../runtime/hybridRuntime';
import { TenantContext } from '../infrastructure/platform/tenantContracts';

/**
 * COGNITIVE PLATFORM SDK
 * 
 * The primary entry point for developers to interact with the EasyTutor Cognitive Infrastructure.
 * Provides high-level abstractions for inference, retrieval, and governance.
 */
export class CognitivePlatformSdk {
  constructor(private readonly context: TenantContext) {}

  /**
   * Executes a cognitive operation through the governed hybrid runtime.
   */
  async execute(request: Omit<RuntimeRequest, 'portal_type'>): Promise<RuntimeResult> {
    return HybridRuntime.getInstance().execute({
      ...request,
      portal_type: this.context.portal_type,
      payload: {
        ...request.payload,
        __tenant_id: this.context.tenant_id,
        __org_id: this.context.org_id
      }
    });
  }

  /**
   * Registers a callback for real-time execution updates.
   */
  subscribeToEvents(callback: (event: any) => void): void {
    // Logic to bridge into the platform's internal event bus
    console.log(`[SDK] Subscribing tenant ${this.context.tenant_id} to operational events`);
  }
}
