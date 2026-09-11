import { describe, it, expect } from 'vitest';
import { runtimeExecutionRegistry } from '../../src/runtime/runtimeExecutionRegistry';
import { deterministicSnapshots } from '../../src/runtime/deterministicExecutionSnapshots';

describe('Deterministic resume flow (e2e smoke)', () => {
  it('creates registry entry and saves snapshot hash', async () => {
    const metadata = { execution_id: 'ex2', canonical_id: 'c2', operation: 'generation', started_at: new Date().toISOString() } as any;
    const snapshot = { metadata, state: { progress: 0 } } as any;

    runtimeExecutionRegistry.register({ metadata, status: 'running' });
    await deterministicSnapshots.save('snapshot:ex2', snapshot);

    const loaded = await deterministicSnapshots.load('snapshot:ex2');
    expect(loaded).toBeDefined();
    expect(loaded?.deterministic_hash).toBeDefined();
  });
});
