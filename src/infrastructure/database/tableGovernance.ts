/**
 * Single source of truth for how each governed table identifies its owner and
 * whether its rows are partitioned by portal.
 *
 * Three consumers read this map:
 *   - governed reads  (`buildPortalScopedQuery`) filter on `ownerColumn`
 *   - governed writes (`executeGovernedWrite`) stamp `ownerColumn`
 *   - tests            (`tests/infrastructure/tableGovernance.test.ts`) assert
 *                      it matches `supabase/migrations/20261104_rls_hardening.sql`
 *
 * Before this map existed, reads hard-coded `user_id` while writes special-cased
 * `profiles` to `id`. Reads of `profiles` therefore filtered a column that does
 * not exist (PostgREST 42703), the profile sync threw, and onboarding silently
 * fell back to "Profile sync failed. Using offline defaults."
 *
 * `portalScoped` means "reads may filter `portal_type`". It is false for tables
 * that have no such column, and also for `profiles`: a profile is one row per
 * user, so filtering it by the *currently selected* portal hides the row (and
 * resets onboarding) as soon as the learner switches mode.
 */
export type OwnerColumn = 'id' | 'user_id';

export interface TableGovernance {
  /** Column holding the owning `auth.users.id`; null for shared reference data. */
  ownerColumn: OwnerColumn | null;
  /** True when rows are partitioned by `portal_type` and reads should filter it. */
  portalScoped: boolean;
}

export const TABLE_GOVERNANCE: Readonly<Record<string, TableGovernance>> = {
  // ── Per-user singletons ────────────────────────────────────────────────────
  profiles: { ownerColumn: 'id', portalScoped: false },

  // ── Portal-partitioned user tables (have a portal_type column) ─────────────
  user_progress: { ownerColumn: 'user_id', portalScoped: true },
  user_topic_progress: { ownerColumn: 'user_id', portalScoped: true },
  quiz_sessions: { ownerColumn: 'user_id', portalScoped: true },
  cached_roadmaps: { ownerColumn: 'user_id', portalScoped: true },
  ai_feedback: { ownerColumn: 'user_id', portalScoped: true },
  user_feedback: { ownerColumn: 'user_id', portalScoped: true },
  ai_literacy_progress: { ownerColumn: 'user_id', portalScoped: true },
  learning_goals: { ownerColumn: 'user_id', portalScoped: true },
  documents: { ownerColumn: 'user_id', portalScoped: true },
  document_chunks: { ownerColumn: 'user_id', portalScoped: true },
  knowledge_chunks: { ownerColumn: 'user_id', portalScoped: true },

  // ── User tables without a portal_type column ───────────────────────────────
  subject_mastery: { ownerColumn: 'user_id', portalScoped: false },
  practice_sessions: { ownerColumn: 'user_id', portalScoped: false },
  learning_recommendations: { ownerColumn: 'user_id', portalScoped: false },
  performance_profiles: { ownerColumn: 'user_id', portalScoped: false },
  learning_trend_snapshots: { ownerColumn: 'user_id', portalScoped: false },
  learning_identities: { ownerColumn: 'user_id', portalScoped: false },
  knowledge_paths: { ownerColumn: 'user_id', portalScoped: false },
  learning_interventions: { ownerColumn: 'user_id', portalScoped: false },
  learning_plans: { ownerColumn: 'user_id', portalScoped: false },
  learning_risk_predictions: { ownerColumn: 'user_id', portalScoped: false },
  learning_coach_reports: { ownerColumn: 'user_id', portalScoped: false },
  learning_retention_profiles: { ownerColumn: 'user_id', portalScoped: false },
  adaptive_learning_paths: { ownerColumn: 'user_id', portalScoped: false },

  // ── Shared reference data (public read, no owner) ──────────────────────────
  knowledge_nodes: { ownerColumn: null, portalScoped: false },
};

/** Governance for a table, or null when the table is not governed. */
export const governanceFor = (table: string): TableGovernance | null =>
  TABLE_GOVERNANCE[table] ?? null;

/** Owner column for a table, or null when the table is shared/unregistered. */
export const ownerColumnFor = (table: string): OwnerColumn | null =>
  governanceFor(table)?.ownerColumn ?? null;

/** Whether reads may filter this table by `portal_type`. Unknown tables: no. */
export const isPortalScoped = (table: string): boolean =>
  governanceFor(table)?.portalScoped ?? false;
