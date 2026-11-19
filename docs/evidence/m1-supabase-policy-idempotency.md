# Supabase policy idempotency fix — 2026-11-19

Branch `feat/ai-routing-truth` (PR #6). Scope: one pre-existing migration defect that
blocked merging PR #6. M1 itself changed **no** SQL files (`git diff --name-only
origin/main..HEAD -- 'supabase/**'` returned nothing); this defect surfaced when Daniel
attempted the merge check. No cloud project, dashboard or Vercel action was used by me.

## 1. Reported failure (from Daniel, not produced by me)

```
ERROR: policy "Users can manage their own progress" for table "user_progress" already exists (SQLSTATE 42710)
At statement: 6
CREATE POLICY "Users can manage their own progress"
ON user_progress
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
```

That SQL is byte-for-byte `supabase/migrations/20260511_security_hardening.sql:35-39`
after the fix (lines 32-36 before it) — the only occurrence of the multiline
`TO authenticated` form in the repo. It is statement 6 of that file:

1. `ALTER TABLE documents ENABLE ROW LEVEL SECURITY`
2. `CREATE POLICY ... ON documents`
3. `CREATE POLICY ... ON document_chunks`
4. `CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx`
5. `ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY`
6. `CREATE POLICY ... ON user_progress` ← failed

## 2. Root cause

`supabase/schema.sql:98` creates `"Users can manage their own progress"` on
`user_progress` with a bare `CREATE POLICY`. The cloud preview DB was bootstrapped from
`schema.sql`, so that policy already existed when the migration chain was applied. The
migration had no `DROP POLICY IF EXISTS` guard, so PostgreSQL raised `42710`.

This was invisible to the W1-7 from-zero proof: `supabase db reset` does **not** replay
`schema.sql` (filename has no timestamp prefix), so in that path the policy does not
exist when statement 6 runs. Both paths are real; only one was covered.

The same latent collision existed for the two preceding policies:
`schema.sql:225-226` and `schema.sql:243-245` create the same document/chunk policy
names as migration statements 2 and 3. Those would have failed next.

## 3. Reproduced before the fix (throwaway local Postgres 16, port 55461)

Fixture `/tmp/opencode/m1-policy-fixture.sql` creates the three tables, enables RLS, and
pre-creates only the `user_progress` policy — the state in which the report's statement 6
fails. Applying the unmodified migration:

```
ALTER TABLE
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE INDEX
ALTER TABLE
ERROR:  policy "Users can manage their own progress" for table "user_progress" already exists
MIGRATION_EXIT=3
```

Five statements applied, sixth failed — matching `At statement: 6`.

## 4. Fix

`supabase/migrations/20260511_security_hardening.sql`: add `DROP POLICY IF EXISTS` before
each of the three `CREATE POLICY` statements (documents, document_chunks, user_progress).
This is additive only: when a policy is absent the guard is a no-op, so the proven
from-zero reset path is unchanged. No policy definition, role, command or predicate was
weakened; the migration still creates `FOR ALL TO authenticated` with the same `USING`
expressions.

## 5. Verified after the fix (same throwaway DB, commands run this session)

```
FIXTURE_EXIT=0
FIRST_APPLY_EXIT=0
SECOND_APPLY_EXIT=0
MIGRATION_OVER_SCHEMA_POLICIES_EXIT=0
```

- First apply over the reported state: exit 0.
- Second apply of the same migration: exit 0 (idempotent; only the `CREATE INDEX IF
  NOT EXISTS` notice repeats).
- Re-created all three policies in `schema.sql` form (bare `CREATE POLICY`, no `TO
  authenticated`), then applied the migration: exit 0 — this covers statements 2 and 3.
- Resulting policies, queried from `pg_policies`:

```
 document_chunks | Users can access their own document chunks | {authenticated} | ALL | (EXISTS (SELECT 1 FROM documents WHERE documents.id = document_chunks.document_id AND documents.user_id = auth.uid()))
 documents       | Users can manage their own documents       | {authenticated} | ALL | (auth.uid() = user_id)
 user_progress   | Users can manage their own progress        | {authenticated} | ALL | (auth.uid() = user_id)
```

Owner predicates are unchanged and still fail closed.

## 6. Not claimed

- I did not apply this to the cloud preview or production project; Daniel must re-run the
  Supabase check / merge after pushing.
- A full `supabase db reset` from zero was not re-run this session. The added guards are
  no-ops when the policies are absent, which the first apply above demonstrates for two
  of the three statements; the historical W1-7 evidence records that path as green.
- The temporary container `et-m1-policy-proof` was local-only and removed after the proof.
