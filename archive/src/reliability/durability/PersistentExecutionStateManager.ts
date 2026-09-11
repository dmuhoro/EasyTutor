import { Database } from '../../infrastructure/database';

/**
 * PERSISTENT EXECUTION STATE MANAGER
 * 
 * Manages the durable storage and retrieval of long-lived execution states, 
 * allowing workflows to pause, resume, and survive infrastructure restarts.
 */
export class PersistentExecutionStateManager {
  static async saveState(workflowId: string, state: any): Promise<void> {
    await Database.governedWrite('workflow_memory', {
      workflow_id: workflowId,
      memory_snapshot: state,
      updated_at: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { workflow_id: true },
      portalType: 'high_school'
    });
  }

  static async loadState(workflowId: string): Promise<any | null> {
    const query = Database.governedQuery({
      table: 'workflow_memory',
      columns: '*',
      portalType: 'high_school'
    });

    const { data } = await (query as any).eq('workflow_id', workflowId).maybeSingle();
    return data ? data.memory_snapshot : null;
  }
}
