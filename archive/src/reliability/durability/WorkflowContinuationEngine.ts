import { PersistentExecutionStateManager } from './PersistentExecutionStateManager';
import { Telemetry } from '../../observability/telemetry';

/**
 * WORKFLOW CONTINUATION ENGINE
 * 
 * Safely resumes interrupted or paused workflows from their last durable state,
 * ensuring deterministic continuation of multi-day operations.
 */
export class WorkflowContinuationEngine {
  static async resumeWorkflow(workflowId: string, executeFn: (state: any) => Promise<void>): Promise<void> {
    const state = await PersistentExecutionStateManager.loadState(workflowId);
    
    if (!state) {
      console.warn(`[CONTINUATION] No state found for workflow ${workflowId}. Starting fresh.`);
    } else {
      console.log(`[CONTINUATION] Resuming workflow ${workflowId} from durable state.`);
    }

    Telemetry.emit({
      event: 'WORKFLOW_RESUMED',
      source: 'platform',
      operationType: 'resilience',
      payload: { workflow_id: workflowId, state_exists: !!state }
    });

    await executeFn(state || {});
  }
}
