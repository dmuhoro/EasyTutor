import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';
import { Database } from '../../src/infrastructure/database';

const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Per-user private storage isolation (Constitution Article II)', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('governedWrite stamps user_id on document_chunks writes', async () => {
    await Database.governedWrite('document_chunks', {
      id: 'chunk-a-1',
      document_id: 'doc-a-1',
      content: 'User A private automotive notes',
      embedding: new Array(384).fill(0.1),
    }, {
      userId: USER_A,
      portalType: 'knowledge_explorer',
    });

    const rows = mockSupabase.db.document_chunks;
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(USER_A);
    expect(rows[0].portal_type).toBe('knowledge_explorer');
    expect(rows[0].content).toBe('User A private automotive notes');
  });

  it('user B cannot read user A document chunks through governedQuery', async () => {
    // User A writes private data
    await Database.governedWrite('document_chunks', {
      id: 'chunk-a-1',
      document_id: 'doc-a-1',
      content: 'User A private automotive notes',
      embedding: new Array(384).fill(0.1),
    }, {
      userId: USER_A,
      portalType: 'knowledge_explorer',
    });

    // User B queries for their own chunks — governedQuery adds .eq('user_id', USER_B)
    let resultB: any = null;
    Database.governedQuery({
      table: 'document_chunks',
      columns: '*',
      userId: USER_B,
      portalType: 'knowledge_explorer',
    }).then((r: any) => { resultB = r; });

    expect(resultB.data).toHaveLength(0);
    expect(resultB.data).not.toContainEqual(expect.objectContaining({ id: 'chunk-a-1' }));
  });

  it('user A can read their own document chunks through governedQuery', async () => {
    await Database.governedWrite('document_chunks', {
      id: 'chunk-a-1',
      document_id: 'doc-a-1',
      content: 'User A private automotive notes',
      embedding: new Array(384).fill(0.1),
    }, {
      userId: USER_A,
      portalType: 'knowledge_explorer',
    });

    let resultA: any = null;
    Database.governedQuery({
      table: 'document_chunks',
      columns: '*',
      userId: USER_A,
      portalType: 'knowledge_explorer',
    }).then((r: any) => { resultA = r; });

    expect(resultA.data).toHaveLength(1);
    expect(resultA.data[0].id).toBe('chunk-a-1');
    expect(resultA.data[0].user_id).toBe(USER_A);
  });

  it('governedWrite stamps user_id on learning_goals writes', async () => {
    await Database.governedWrite('learning_goals', {
      id: 'goal-a-1',
      topic: 'braking-systems',
      unit: 'Automotive Science',
      status: 'in_progress',
    }, {
      userId: USER_A,
      portalType: 'knowledge_explorer',
    });

    const rows = mockSupabase.db.learning_goals;
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(USER_A);
  });

  it('user B cannot read user A learning goals through governedQuery', async () => {
    await Database.governedWrite('learning_goals', {
      id: 'goal-a-1',
      topic: 'braking-systems',
      unit: 'Automotive Science',
      status: 'in_progress',
    }, {
      userId: USER_A,
      portalType: 'knowledge_explorer',
    });

    let resultB: any = null;
    Database.governedQuery({
      table: 'learning_goals',
      columns: '*',
      userId: USER_B,
      portalType: 'knowledge_explorer',
    }).then((r: any) => { resultB = r; });

    expect(resultB.data).toHaveLength(0);
    expect(resultB.data).not.toContainEqual(expect.objectContaining({ id: 'goal-a-1' }));
  });

  it('quarantine: both users can coexist with separate data', async () => {
    // User A writes
    await Database.governedWrite('document_chunks', {
      id: 'chunk-a-1',
      document_id: 'doc-a-1',
      content: 'User A data',
      embedding: new Array(384).fill(0.1),
    }, {
      userId: USER_A,
      portalType: 'knowledge_explorer',
    });

    // User B writes
    await Database.governedWrite('document_chunks', {
      id: 'chunk-b-1',
      document_id: 'doc-b-1',
      content: 'User B data',
      embedding: new Array(384).fill(0.1),
    }, {
      userId: USER_B,
      portalType: 'knowledge_explorer',
    });

    // Total rows in DB = 2 (both users' data is stored)
    const allRows = mockSupabase.db.document_chunks;
    expect(allRows).toHaveLength(2);

    // User A only sees their own
    let resultA: any = null;
    Database.governedQuery({
      table: 'document_chunks',
      columns: '*',
      userId: USER_A,
      portalType: 'knowledge_explorer',
    }).then((r: any) => { resultA = r; });
    expect(resultA.data).toHaveLength(1);
    expect(resultA.data[0].id).toBe('chunk-a-1');

    // User B only sees their own
    let resultB: any = null;
    Database.governedQuery({
      table: 'document_chunks',
      columns: '*',
      userId: USER_B,
      portalType: 'knowledge_explorer',
    }).then((r: any) => { resultB = r; });
    expect(resultB.data).toHaveLength(1);
    expect(resultB.data[0].id).toBe('chunk-b-1');
  });
});
