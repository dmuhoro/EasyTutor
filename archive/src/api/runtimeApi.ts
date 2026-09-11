import { HybridRuntime, RuntimeRequest, RuntimeResult } from '../runtime/hybridRuntime';
import { runtimeHealthMonitor } from '../runtime/runtimeHealthMonitor';
import { GovernedApiGateway } from './governedApiGateway';

/**
 * RUNTIME API
 * 
 * Exposes the hybrid cognitive runtime for remote execution.
 */
export class RuntimeApi {
  static async execute(
    headers: Record<string, string>, 
    request: RuntimeRequest
  ): Promise<RuntimeResult> {
    return GovernedApiGateway.handleRequest(
      'runtime:execute',
      headers,
      'student',
      () => HybridRuntime.getInstance().execute(request)
    );
  }

  static async getHealth(headers: Record<string, string>): Promise<any> {
    return GovernedApiGateway.handleRequest(
      'runtime:health',
      headers,
      'moderator',
      () => runtimeHealthMonitor.getStatus()
    );
  }
}
