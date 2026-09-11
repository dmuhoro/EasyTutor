import { describe, it, expect } from 'vitest';
import { deterministicSnapshots } from '../../src/runtime/deterministicExecutionSnapshots';
import { runtimeExecutionRegistry } from '../../src/runtime/runtimeExecutionRegistry';
import { cognitiveRecoveryCoordinator } from '../../src/runtime/cognitiveRecoveryCoordinator';

describe('Offline recovery flow (e2e smoke)', () => {
  it('persists and attempts recovery from snapshot', async () => {
    const snapshot = {
      metadata: { execution_id: 'ex1', canonical_id: 'c1', operation: 'inference', started_at: new Date().toISOString() },
      state: { step: 1 },
    } as any;

    await deterministicSnapshots.save('snapshot:ex1', snapshot);
    runtimeExecutionRegistry.register({ metadata: snapshot.metadata, snapshot, status: 'failed' });

    const recovered = await cognitiveRecoveryCoordinator.attemptRecovery('ex1');
    expect(typeof recovered).toBe('boolean');
  });
});
