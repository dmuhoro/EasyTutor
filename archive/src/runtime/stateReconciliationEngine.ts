import { ExecutionSnapshot } from './unifiedRuntimeContracts';

/**
 * STATE RECONCILIATION ENGINE
 * 
 * Reconciles the local runtime state with external checkpoints.
 */
export class StateReconciliationEngine {
  reconcile(current: Record<string, unknown>, snapshot: ExecutionSnapshot): Record<string, unknown> {
    const targetState = snapshot.state as Record<string, unknown>;
    
    // Perform a selective merge: keep transient UI state from current,
    // but force business/logic state from the snapshot.
    const reconciled = {
      ...current,
      ...targetState,
      // Ensure metadata fields are preserved from snapshot for governance
      _governance: (targetState as any)._governance,
      _version: (targetState as any)._version
    };

    return reconciled;
  }
}

export const stateReconciliationEngine = new StateReconciliationEngine();
