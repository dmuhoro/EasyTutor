import { MemoryRecord } from '../agenticContracts';

export class CognitiveCompressionEngine {
  compress(records: readonly MemoryRecord<any>[]): string {
    return records
      .map((record) => `${record.memory_id}:${record.tags.join('|')}:${JSON.stringify(record.content)}`)
      .join('\n');
  }
}
