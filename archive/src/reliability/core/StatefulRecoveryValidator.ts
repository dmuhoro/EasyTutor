import { Database } from '../../infrastructure/database';
import { ExecutionCheckpoint } from '../reliabilityContracts';

/**
 * STATEFUL RECOVERY VALIDATOR
 * 
 * Validates that distributed system recovery operations are deterministic 
 * and replay-safe, preventing double-execution or data loss.
 */
export class StatefulRecoveryValidator {
  static async validateRecoveryPreconditions(checkpointId: string): Promise<boolean> {
    const query = Database.governedQuery({
      table: 'execution_checkpoints',
      columns: 'is_verified',
      portalType: 'high_school'
    });

    const { data } = await (query as any).eq('checkpoint_id', checkpointId).maybeSingle();
    
    // Recovery is only valid if the checkpoint exists and hasn't been maliciously altered
    if (!data) return false;
    return data.is_verified === true;
  }

  static async markRecovered(checkpointId: string): Promise<void> {
    await Database.governedWrite('execution_checkpoints', {
      checkpoint_id: checkpointId,
      status: 'recovered',
      recovered_at: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { checkpoint_id: true },
      portalType: 'high_school'
    });
  }
}
