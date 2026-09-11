import { AgenticPersistence } from '../agenticPersistence';
import { MemoryAccessRequest, MemoryRecord, deterministicId } from '../agenticContracts';
import { AgentExecutionGovernor } from '../../runtime/agentic/agentExecutionGovernor';

export abstract class BaseMemoryStore<T> {
  constructor(
    protected readonly governor = new AgentExecutionGovernor(),
    protected readonly memoryKind: MemoryAccessRequest['memory_kind'],
  ) {}

  async get(request: MemoryAccessRequest, key: string): Promise<MemoryRecord<T> | null> {
    this.governor.validateMemoryAccess(request);
    return AgenticPersistence.read<MemoryRecord<T>>(this.storageKey(request, key));
  }

  async put(request: MemoryAccessRequest, key: string, record: Omit<MemoryRecord<T>, 'memory_id' | 'updated_at'>): Promise<MemoryRecord<T>> {
    this.governor.validateMemoryAccess(request);

    const stored: MemoryRecord<T> = {
      ...record,
      memory_id: deterministicId(request.namespace, this.memoryKind, key),
      updated_at: new Date().toISOString(),
    };

    await AgenticPersistence.write(this.storageKey(request, key), stored);
    return stored;
  }

  async list(request: MemoryAccessRequest, keys: readonly string[]): Promise<MemoryRecord<T>[]> {
    const results = await Promise.all(keys.map((key) => this.get(request, key)));
    return results.filter(Boolean) as MemoryRecord<T>[];
  }

  private storageKey(request: MemoryAccessRequest, key: string): string {
    return `${request.namespace}:${this.memoryKind}:${key}`;
  }
}
