import { MemoryRecord } from '../agenticContracts';

export class ImportanceScoringEngine {
  score(record: MemoryRecord<any>, recencyBoost = 1): number {
    const tagWeight = Math.min(record.tags.length / 10, 0.3);
    return Math.min(1, record.importance * 0.6 + tagWeight + recencyBoost * 0.1);
  }
}
