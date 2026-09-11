import { EdgeExecutionCache } from './EdgeExecutionCache';
import { IntermittentConnectivityHandler } from './IntermittentConnectivityHandler';

export class MobileRuntimeCoordinator {
  private readonly cache = new EdgeExecutionCache<Record<string, unknown>>(60_000);
  private readonly connectivity = new IntermittentConnectivityHandler();

  async execute(taskId: string, runtimeTask: () => Promise<Record<string, unknown>>): Promise<Record<string, unknown>> {
    const cached = this.cache.get(taskId);
    if (cached) return { ...cached, source: 'cache' };
    const result = await this.connectivity.withRetry(runtimeTask, 2, 4_000);
    this.cache.set(taskId, result);
    return { ...result, source: 'live' };
  }
}
