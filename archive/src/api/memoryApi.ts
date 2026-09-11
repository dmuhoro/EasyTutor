import { GovernedApiGateway } from './governedApiGateway';
import { resilientCheckpointStore } from '../runtime/resilientCheckpointStore';

/**
 * MEMORY API
 * 
 * Exposes governed memory and checkpoint access as a platform service.
 */
export class MemoryApi {
  static async getCheckpoint(
    headers: Record<string, string>, 
    executionId: string, 
    step: number
  ): Promise<any> {
    return GovernedApiGateway.handleRequest(
      'memory:get_checkpoint',
      headers,
      'tutor',
      () => resilientCheckpointStore.loadCheckpoint(executionId, step)
    );
  }

  static async listCheckpoints(
    headers: Record<string, string>, 
    executionId: string
  ): Promise<number[]> {
    return GovernedApiGateway.handleRequest(
      'memory:list_checkpoints',
      headers,
      'tutor',
      () => resilientCheckpointStore.listCheckpoints(executionId)
    );
  }
}
