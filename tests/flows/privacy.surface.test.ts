import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Database } from '../../src/infrastructure/database';
import { ownerColumnFor } from '../../src/infrastructure/database/tableGovernance';
import { getConsent, grantConsent, withdrawConsent } from '../../lib/privacy/consent';
import { deleteUserData } from '../../lib/privacy/dataDeletion';
import { exportUserData } from '../../lib/privacy/dataExport';
import { useAuthStore } from '../../store/authStore';
import { useProgressStore } from '../../store/progressStore';
import { useRoadmapStore } from '../../store/roadmapStore';

const LEARNER = '11111111-1111-4111-8111-111111111111';

/** Tables with an owner column and a client-side DELETE policy in
 * `supabase/migrations/20261104_rls_hardening.sql`. Append-only audit tables
 * (learning_evidence, user_events, ai_call_logs) are intentionally excluded. */
const MUTABLE_OWNED_TABLES = [
  'profiles', 'user_progress', 'user_topic_progress', 'quiz_sessions', 'cached_roadmaps',
  'ai_feedback', 'user_feedback', 'ai_literacy_progress', 'practice_sessions', 'subject_mastery',
  'learning_recommendations', 'performance_profiles', 'learning_trend_snapshots',
  'learning_identities', 'knowledge_paths', 'learning_interventions', 'learning_plans',
  'learning_risk_predictions', 'learning_coach_reports', 'learning_retention_profiles',
  'adaptive_learning_paths', 'learning_goals', 'documents', 'document_chunks',
];

interface DeleteCall { table: string; column: string; value: string }
const boundary = vi.hoisted(() => ({
  deletes: [] as DeleteCall[],
  upserts: [] as string[],
  user: { id: '11111111-1111-4111-8111-111111111111' } as { id: string } | null,
  failTable: null as string | null,
}));

function fakeClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: boundary.user }, error: null }),
    },
    from: (table: string) => ({
      delete: () => ({
        eq: (column: string, value: string) => {
          boundary.deletes.push({ table, column, value });
          return Promise.resolve({
            data: null,
            error: boundary.failTable === table ? { message: 'forced delete failure' } : null,
          });
        },
      }),
      upsert: (payload: unknown) => {
        boundary.upserts.push(table);
        return { select: () => ({ single: async () => ({ data: payload, error: null }) }) };
      },
    }),
  };
}

(globalThis as typeof globalThis & { __MOCK_SUPABASE_CLIENT__?: unknown }).__MOCK_SUPABASE_CLIENT__ = fakeClient();

const setLocalLearner = (): void => {
  useProgressStore.getState().setUserId(LEARNER);
  useRoadmapStore.getState().setUserId(LEARNER);
};

async function auditMessages(): Promise<string[]> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  const raw = await AsyncStorage.getItem('easytutor_app_logs_v2');
  const events: Array<{ message: string }> = raw ? JSON.parse(raw) : [];
  return events.map((event) => event.message);
}

describe('Privacy surface — real governed deletion boundary', () => {
  beforeEach(() => {
    boundary.deletes.length = 0;
    boundary.upserts.length = 0;
    boundary.user = { id: LEARNER };
    boundary.failTable = null;
    (globalThis as typeof globalThis & { __MOCK_SUPABASE_CLIENT__?: unknown }).__MOCK_SUPABASE_CLIENT__ = fakeClient();
    useAuthStore.getState().setSession(null);
    useProgressStore.getState().setUserId(null);
    useProgressStore.getState().clearProgress();
    useRoadmapStore.getState().setUserId(null);
    useRoadmapStore.getState().clearRoadmaps();
  });

  it('deletes every mutable owned table through DELETE, never through an upsert', async () => {
    setLocalLearner();
    const report = await deleteUserData();

    expect(report.ok).toBe(true);
    expect(boundary.deletes.map((call) => call.table).sort()).toEqual([...MUTABLE_OWNED_TABLES].sort());
    expect(boundary.deletes.every((call) => call.column === ownerColumnFor(call.table))).toBe(true);
    expect(boundary.deletes.every((call) => call.value === LEARNER)).toBe(true);
    // The old implementation "deleted" by upserting a user_id-only row.
    expect(boundary.upserts).toEqual([]);
  });

  it('refuses without an authenticated Supabase user and leaves local data intact', async () => {
    setLocalLearner();
    boundary.user = null;

    const report = await deleteUserData();

    expect(report.ok).toBe(false);
    expect(boundary.deletes).toEqual([]);
    expect(useProgressStore.getState().userId).toBe(LEARNER);
    expect(await auditMessages()).toContain('PRIVACY_DELETION_REFUSED');
  });

  it('fails closed when any table deletion fails: reports it and clears nothing', async () => {
    setLocalLearner();
    boundary.failTable = 'user_progress';

    const report = await deleteUserData();

    expect(report.ok).toBe(false);
    expect(report.failedTables.map((failure) => failure.table)).toContain('user_progress');
    expect(useProgressStore.getState().userId).toBe(LEARNER);
    expect(await auditMessages()).toContain('PRIVACY_DELETION_FAILED');
  });

  it('refuses to delete a shared/unregistered table at the infrastructure boundary', async () => {
    await expect(Database.governedDelete('knowledge_nodes')).rejects.toThrow(/GOVERNANCE ERROR/);
    expect(boundary.deletes).toEqual([]);
  });

  it('consent and export fail closed for a signed-out learner', async () => {
    expect(await getConsent()).toMatchObject({ consented: false, analytics: false, marketing: false });
    expect(await exportUserData()).toBeNull();

    await grantConsent({ analytics: true });
    expect((await getConsent()).analytics).toBe(true);
    await withdrawConsent();
    expect(await getConsent()).toMatchObject({ consented: false, dataProcessing: false, analytics: false });
  });
});
