import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { Database } from '../../src/infrastructure/database';
import { buildPortalScopedQuery } from '../../src/infrastructure/database/governedQueries';
import { executeGovernedWrite } from '../../src/infrastructure/database/governedWrites';
import {
  TABLE_GOVERNANCE,
  isPortalScoped,
  ownerColumnFor,
} from '../../src/infrastructure/database/tableGovernance';
import { mockSupabase } from '../utils/mockSupabase';

/** Records the filters a query builder would send to PostgREST. */
function recordingClient() {
  const calls: Array<{ op: 'select' | 'eq'; column: string; value?: unknown }> = [];
  const builder = {
    select: (column: string) => {
      calls.push({ op: 'select', column });
      return builder;
    },
    eq: (column: string, value: unknown) => {
      calls.push({ op: 'eq', column, value });
      return builder;
    },
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  };
  const client = { from: () => builder };
  return { client, calls };
}

/** The owner map the RLS hardening migration enforces in the database. */
function rlsOwnerMap(): Array<[string, string]> {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261104_rls_hardening.sql'),
    'utf8',
  );
  const start = sql.indexOf('tables text[][] := array[');
  const end = sql.indexOf('];', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const block = sql.slice(start, end);
  return [...block.matchAll(/array\['([a-z_]+)',\s*'([a-z_]+)'\]/g)]
    .map((match) => [match[1], match[2]] as [string, string]);
}

describe('table governance map', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('agrees with the owner columns enforced by the RLS hardening migration', () => {
    const pairs = rlsOwnerMap();
    expect(pairs.length).toBeGreaterThanOrEqual(20);
    for (const [table, ownerColumn] of pairs) {
      expect(ownerColumnFor(table), `${table} owner column`).toBe(ownerColumn);
    }
  });

  it('filters every owned table on its real owner column, never on a missing one', () => {
    for (const [table, governance] of Object.entries(TABLE_GOVERNANCE)) {
      if (!governance.ownerColumn) continue;
      const { client, calls } = recordingClient();
      buildPortalScopedQuery(client as never, {
        table,
        columns: '*',
        portalType: 'high_school',
        userId: 'user-1',
      });

      const eqColumns = calls.filter((call) => call.op === 'eq').map((call) => call.column);
      expect(eqColumns, `${table} owner filter`).toContain(governance.ownerColumn);
      const otherOwnerColumn = governance.ownerColumn === 'id' ? 'user_id' : 'id';
      expect(eqColumns, `${table} must not filter on ${otherOwnerColumn}`).not.toContain(otherOwnerColumn);
      expect(calls.find((call) => call.column === governance.ownerColumn)?.value).toBe('user-1');
    }
  });

  it('only filters portal_type on tables that are portal-scoped', () => {
    for (const [table, governance] of Object.entries(TABLE_GOVERNANCE)) {
      const { client, calls } = recordingClient();
      buildPortalScopedQuery(client as never, {
        table,
        columns: '*',
        portalType: 'knowledge_explorer',
        userId: governance.ownerColumn ? 'user-1' : undefined,
      });
      const portalFilters = calls.filter((call) => call.column === 'portal_type');
      expect(portalFilters.length, `${table} portal_type filter`).toBe(governance.portalScoped ? 1 : 0);
      if (governance.portalScoped) {
        expect(portalFilters[0].value).toBe('knowledge_explorer');
      }
    }
  });

  it('stamps writes with the same owner column the reads filter on', async () => {
    for (const [table, governance] of Object.entries(TABLE_GOVERNANCE)) {
      if (!governance.ownerColumn) continue;
      const { client } = recordingClient();
      const rows: Array<Record<string, unknown>> = [];
      const writeClient = {
        from: () => ({
          upsert: (payload: Record<string, unknown>) => {
            rows.push(payload);
            return { data: null, error: null };
          },
        }),
      };
      await executeGovernedWrite(writeClient as never, {
        table,
        portalType: 'high_school',
        userId: 'user-1',
        payload: { title: 'x' },
      });
      // `client` is unused for writes; assert through the captured payload.
      void client;

      expect(rows, `${table} write payload`).toHaveLength(1);
      expect(rows[0][governance.ownerColumn], `${table} stamped owner`).toBe('user-1');
      expect('portal_type' in rows[0], `${table} portal_type stamp`).toBe(governance.portalScoped);
    }
  });

  it('reads the signed-in user profile even when the active portal differs from the stored row', async () => {
    mockSupabase.db.profiles[0].learning_mode = 'self_directed';
    mockSupabase.db.profiles[0].onboarding_complete = true;
    mockSupabase.db.profiles[0].portal_type = 'high_school';

    const { data, error } = await Database.governedQuery({
      table: 'profiles',
      columns: '*',
      portalType: 'knowledge_explorer',
      userId: mockSupabase.user.id,
    }).maybeSingle();

    const profile = data as unknown as Record<string, unknown> | null;
    expect(error).toBeNull();
    expect(profile?.id).toBe(mockSupabase.user.id);
    expect(profile?.onboarding_complete).toBe(true);
  });

  it('keeps a profile readable after onboarding is saved and the app reloads', async () => {
    await executeGovernedWrite(mockSupabase.client as never, {
      table: 'profiles',
      portalType: 'high_school',
      userId: mockSupabase.user.id,
      payload: {
        id: mockSupabase.user.id,
        email: mockSupabase.user.email,
        learning_mode: 'self_directed',
        onboarding_complete: true,
      },
    });

    // Reload: a fresh read through the same governed path, with the portal the
    // app resolves for a self-directed learner.
    const { data } = await Database.governedQuery({
      table: 'profiles',
      columns: '*',
      portalType: 'knowledge_explorer',
      userId: mockSupabase.user.id,
    }).maybeSingle();

    const profile = data as unknown as Record<string, unknown> | null;
    expect(profile?.onboarding_complete).toBe(true);
    expect(profile?.learning_mode).toBe('self_directed');
    expect(isPortalScoped('profiles')).toBe(false);
  });
});
