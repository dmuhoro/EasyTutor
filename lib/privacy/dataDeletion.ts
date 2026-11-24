/**
 * Data Deletion (Constitution Article II — Right to Erasure)
 *
 * Deletes the learner's mutable, owned rows through the governed DELETE
 * boundary. Append-only audit tables are retained by design (integrity), and
 * the caller is told exactly what happened instead of receiving a bare
 * boolean that could hide a partial failure.
 */

import { logEvent } from '../../lib/logEvent';
import { Database } from '../../src/infrastructure/database';
import { useActiveProfileStore } from '../../store/activeProfileStore';
import { useAuthStore } from '../../store/authStore';
import { useProgressStore } from '../../store/progressStore';
import { useRoadmapStore } from '../../store/roadmapStore';

/** Owner-scoped tables with a client-side DELETE policy (20261104_rls_hardening.sql). */
export const DELETABLE_TABLES = [
  'profiles', 'user_progress', 'user_topic_progress', 'quiz_sessions', 'cached_roadmaps',
  'ai_feedback', 'user_feedback', 'ai_literacy_progress', 'practice_sessions', 'subject_mastery',
  'learning_recommendations', 'performance_profiles', 'learning_trend_snapshots',
  'learning_identities', 'knowledge_paths', 'learning_interventions', 'learning_plans',
  'learning_risk_predictions', 'learning_coach_reports', 'learning_retention_profiles',
  'adaptive_learning_paths', 'learning_goals', 'documents', 'document_chunks',
] as const;

/** Append-only audit trails: UPDATE/DELETE revoked at the grant layer. */
export const RETAINED_AUDIT_TABLES = ['learning_evidence', 'user_events', 'ai_call_logs'] as const;

export interface DeletionFailure {
  table: string;
  reason: string;
}

export interface DeletionReport {
  ok: boolean;
  deletedTables: string[];
  failedTables: DeletionFailure[];
  retainedTables: readonly string[];
  auditId: string;
}

const makeAuditId = (): string =>
  `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const clearLocalState = (): void => {
  useActiveProfileStore.getState().setActiveProfileId(null);
  useProgressStore.getState().setUserId(null);
  useProgressStore.getState().clearProgress();
  useRoadmapStore.getState().setUserId(null);
  useRoadmapStore.getState().clearRoadmaps();
  useAuthStore.getState().setSession(null);
};

/**
 * Erase every mutable owned row, then clear local state. A failed table is
 * reported explicitly and local state is preserved so the learner can retry
 * without silently losing the only copy of their data.
 */
export const deleteUserData = async (): Promise<DeletionReport> => {
  const auditId = makeAuditId();

  let userId: string;
  try {
    userId = (await Database.getAuthenticatedUser()).id;
  } catch {
    await logEvent('WARN', 'PRIVACY_DELETION_REFUSED', {
      auditId,
      reason: 'unauthenticated',
    });
    return {
      ok: false,
      deletedTables: [],
      failedTables: [],
      retainedTables: RETAINED_AUDIT_TABLES,
      auditId,
    };
  }

  const deletedTables: string[] = [];
  const failedTables: DeletionFailure[] = [];

  for (const table of DELETABLE_TABLES) {
    try {
      await Database.governedDelete(table);
      deletedTables.push(table);
    } catch (err) {
      failedTables.push({
        table,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (failedTables.length > 0) {
    await logEvent('ERROR', 'PRIVACY_DELETION_FAILED', {
      auditId,
      userId,
      deletedTables,
      failedTables,
    });
    return { ok: false, deletedTables, failedTables, retainedTables: RETAINED_AUDIT_TABLES, auditId };
  }

  clearLocalState();
  await logEvent('INFO', 'PRIVACY_DELETION_COMPLETE', {
    auditId,
    userId,
    deletedTables,
    retainedTables: RETAINED_AUDIT_TABLES,
  });
  return { ok: true, deletedTables, failedTables: [], retainedTables: RETAINED_AUDIT_TABLES, auditId };
};
