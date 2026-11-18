# W1-3 — Local Supabase proof (2026-11-17)

Branch `fix/truth-pass` @ `38e2cc8`. Every number below was produced by a command run in this
session. No Vercel / production / dashboard access was used — this is a local, throwaway proof.

---

## 1. Negative facts — reproduced before any change

### 1a. Faithful `supabase db reset` from zero FAILS (cannot be claimed as DONE)

An isolated copy of the repo was made at `/tmp/opencode/w1-dbtest` (unique `project_id =
"w1_dbtest"`, all ports remapped to 55xxx so no running stack is touched). `supabase start`
there reproduced the real failure:

```
$ supabase start            # in /tmp/opencode/w1-dbtest
WARN: auth.email.enable_signup is deprecated ...
Starting database...
Initialising schema...
Seeding globals from roles.sql...
Skipping migration run-all.sql... (file name must match pattern "<timestamp>_name.sql")
Applying migration 20260403_portal_schema.sql...
Applying migration 20260505_progress_system.sql...
Stopping containers...
{"_tag":"Error","error":{"code":"MigrationApplyError",
 "message":"ERROR: relation \"user_progress\" does not exist (SQLSTATE 42P01)"}}
START=1
```

Root cause: the migration chain assumes the base objects in `supabase/schema.sql`, but
`supabase db reset` replays only `supabase/migrations/<timestamp>_*.sql` — it never applies
`schema.sql`. `run-all.sql` is skipped by the CLI (filename does not match the timestamp
pattern). So the repo cannot bootstrap from zero.

### 1b. Full failure list (all migrations, no early stop)

A throwaway `supabase/postgres:17.11.0.011` container (`w1_chain_test`, host port **55522**,
copy of the running stack's env via `--env-file` with values never printed) was prepared with a
clean `public` schema + `vector` extension, then every `supabase/migrations/[0-9]*.sql` applied
in filename order with `psql -v ON_ERROR_STOP=1`. Seven migrations fail — all pre-existing,
none introduced by Wave 1:

```
20260505_progress_system.sql          ERROR: relation "user_progress" does not exist
20260505_unique_constraints.sql       ERROR: syntax error at or near "NOT"  (ADD CONSTRAINT IF NOT EXISTS — invalid PostgreSQL syntax)
20260506_ai_quiz.sql                  ERROR: relation "quiz_sessions" does not exist
20260510_vector_scaling.sql           ERROR: column "metadata" does not exist
20260511_security_hardening.sql       ERROR: relation "user_progress" does not exist
20260524_analytics_observability.sql  ERROR: column "event_name" does not exist
20260527_operational_intelligence_views.sql  ERROR: column "timestamp" does not exist
```

The two new W1 migrations apply cleanly in the same order:
`20261117_private_import_fts.sql EXIT=0`, `20261117_relabel_user_chunks_private.sql EXIT=0`.

### 1c. Decision (ratified in the progress log)

**Do NOT rewrite historical migrations in this truth pass.** Repairing a 7-file historical
chain is high-risk, out of scope for Wave 1, and cannot be proven without a from-zero reset that
currently cannot complete. Instead:

- Bootstrap the local proof DB with the canonical `supabase/schema.sql` (the repo's actual base
  schema), then apply all migrations, tolerating the known legacy conflicts.
- Report `supabase db reset` from zero as **NOT DONE**, with a named recommendation: a separate
  migration-repair project whose exit criterion is a clean `supabase db reset` from zero.
- Keep new migrations forward-only and idempotent (already true for both W1 migrations).

---

## 2. Coherent local proof DB

After applying `schema.sql` then all migrations to `w1_chain_test`, the required state is present
(observed this session):

```
Tables present:   ai_call_logs, ai_daily_usage, document_chunks, documents, learning_goals,
                  profiles, quiz_sessions, user_events, user_progress
Functions:        increment_daily_ai_calls/2, match_document_chunks/2,/3,/8,
                  search_document_chunks_fts/6
Columns:          document_chunks.metadata=jsonb, document_chunks.content_tsv=tsvector
RLS enabled:      ai_daily_usage, document_chunks, documents, profiles, quiz_sessions, user_progress  (all true)
Role grants on public tables: authenticated = DELETE,INSERT,SELECT,UPDATE ; anon = (none)
```

Policies found (owner column in parentheses):
- `documents`, `document_chunks`, `user_progress`, `quiz_sessions`, `learning_goals` →
  `et_owner_select/insert/update/delete` with `auth.uid() = user_id`.
- `profiles` → `et_owner_*` with `auth.uid() = id`.
- `ai_daily_usage` → `et_daily_usage_select/insert/update` with `auth.uid() = user_id`;
  **no DELETE policy** (DELETE is expected to be denied even for the owner — fail closed).

---

## 3. EXPECTED RLS matrix — written BEFORE execution

Seed assumption: one row owned by user A and one by user B in every table (profiles keyed by
`id = user uuid`; other tables by `user_id`). Caller identity is set with
`SET LOCAL request.jwt.claim.sub` under `SET LOCAL ROLE authenticated`; anon runs with
`SET LOCAL ROLE anon` and no claim. `auth.uid()` reads `request.jwt.claim.sub`.

**SELECT — number of rows visible (expected):**

| Caller | documents | document_chunks | user_progress | quiz_sessions | ai_daily_usage | profiles | learning_goals |
|---|---|---|---|---|---|---|---|
| anon | DENIED (no grant) | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED |
| user A | 1 (A only) | 1 (A only) | 1 (A only) | 1 (A only) | 1 (A only) | 1 (A only) | 1 (A only) |
| user B | 1 (B only) | 1 (B only) | 1 (B only) | 1 (B only) | 1 (B only) | 1 (B only) | 1 (B only) |

**INSERT — expected:**

| Caller / action | All 7 tables |
|---|---|
| anon inserts any row | DENIED (no grant) |
| user A inserts row with owner = A | ALLOWED |
| user A inserts row with owner = B | DENIED (WITH CHECK fails) |

**UPDATE — expected:**

| Caller / action | All 7 tables |
|---|---|
| anon updates any row | DENIED (no grant) |
| user A updates own row | ALLOWED (1 row affected) |
| user A updates B's row | DENIED (0 rows affected — USING filter) |

**DELETE — expected:**

| Caller / action | 6 owner tables | ai_daily_usage |
|---|---|---|
| anon deletes any row | DENIED (no grant) | DENIED (no grant) |
| user A deletes own row | ALLOWED (1 row) | DENIED (0 rows — no DELETE policy) |
| user A deletes B's row | DENIED (0 rows) | DENIED (0 rows) |

Cross-user invariant: for every table, user A must never see or mutate user B's row and vice
versa; anon must never read any user table.

**Correction to the prediction (recorded after running, before re-running):** the matrix first
ran with `ai_daily_usage` DELETE expected to return *0 rows* (RLS default-deny). Observed instead
`42501 permission denied for table ai_daily_usage` for all three authenticated DELETE cases.
Root cause, verified this session: `information_schema.role_table_grants` shows
`authenticated` has only `INSERT,SELECT,UPDATE` on `ai_daily_usage` (vs `DELETE,INSERT,SELECT,UPDATE`
on `documents`). This is **stricter** than predicted — a privilege-layer refusal rather than a
row-layer one — so the expectation was corrected from `0 rows` to `DENIED`. This strengthens the
assertion; nothing was loosened to make the suite green.

*(Observed results recorded in §4 below after execution.)*

---

## 4. OBSERVED RLS matrix (executed this session)

Harness: **committed** at `supabase/tests/wave1_rls_matrix.sql` — 104 self-checking cases
(expected value encoded per case), run via `psql -f` against `w1_chain_test`. Caller identity set
with `SET LOCAL ROLE` + `request.jwt.claim.sub`; `auth.uid()` reads that claim. A full-transaction
rollback on any mismatch makes the DO block raise, so a green run is all-or-nothing.

Reproduce (throwaway DB only):

```
docker cp supabase/tests/wave1_rls_matrix.sql <container>:/tmp/rls_matrix.sql
docker exec <container> psql -U postgres -d postgres -f /tmp/rls_matrix.sql
# expect: NOTICE: RLS_MATRIX_SUMMARY total=104 fails=0 ; exit 0
```

```
PASS | SELECT|anon|documents | expected=DENIED | observed=DENIED | 42501 permission denied for table documents
PASS | SELECT|A|documents | expected=1 | observed=1 | - -
PASS | SELECT|B|documents | expected=1 | observed=1 | - -
PASS | SELECT|anon|document_chunks | expected=DENIED | observed=DENIED | 42501 permission denied for table document_chunks
PASS | SELECT|A|document_chunks | expected=1 | observed=1 | - -
PASS | SELECT|B|document_chunks | expected=1 | observed=1 | - -
PASS | SELECT|anon|user_progress | expected=DENIED | observed=DENIED | 42501 permission denied for table user_progress
PASS | SELECT|A|user_progress | expected=1 | observed=1 | - -
PASS | SELECT|B|user_progress | expected=1 | observed=1 | - -
PASS | SELECT|anon|quiz_sessions | expected=DENIED | observed=DENIED | 42501 permission denied for table quiz_sessions
PASS | SELECT|A|quiz_sessions | expected=1 | observed=1 | - -
PASS | SELECT|B|quiz_sessions | expected=1 | observed=1 | - -
PASS | SELECT|anon|learning_goals | expected=DENIED | observed=DENIED | 42501 permission denied for table learning_goals
PASS | SELECT|A|learning_goals | expected=1 | observed=1 | - -
PASS | SELECT|B|learning_goals | expected=1 | observed=1 | - -
PASS | SELECT|anon|ai_daily_usage | expected=DENIED | observed=DENIED | 42501 permission denied for table ai_daily_usage
PASS | SELECT|A|ai_daily_usage | expected=1 | observed=1 | - -
PASS | SELECT|B|ai_daily_usage | expected=1 | observed=1 | - -
PASS | SELECT|anon|profiles | expected=DENIED | observed=DENIED | 42501 permission denied for table profiles
PASS | SELECT|A|profiles | expected=1 | observed=1 | - -
PASS | SELECT|B|profiles | expected=1 | observed=1 | - -
PASS | INSERT|anon|documents|owner=A | expected=DENIED | observed=DENIED | 42501 permission denied for table documents
PASS | INSERT|A|documents|self | expected=1 | observed=1 | - -
PASS | INSERT|A|documents|owner=B | expected=DENIED | observed=DENIED | 42501 new row violates row-level security policy for table "documents"
PASS | INSERT|B|documents|self | expected=1 | observed=1 | - -
PASS | INSERT|anon|document_chunks|owner=A | expected=DENIED | observed=DENIED | 42501 permission denied for table document_chunks
PASS | INSERT|A|document_chunks|self | expected=1 | observed=1 | - -
PASS | INSERT|A|document_chunks|owner=B | expected=DENIED | observed=DENIED | 42501 new row violates row-level security policy for table "document_chunks"
PASS | INSERT|B|document_chunks|self | expected=1 | observed=1 | - -
PASS | INSERT|anon|user_progress|owner=A | expected=DENIED | observed=DENIED | 42501 permission denied for table user_progress
PASS | INSERT|A|user_progress|self | expected=1 | observed=1 | - -
PASS | INSERT|A|user_progress|owner=B | expected=DENIED | observed=DENIED | 42501 new row violates row-level security policy for table "user_progress"
PASS | INSERT|B|user_progress|self | expected=1 | observed=1 | - -
PASS | INSERT|anon|quiz_sessions|owner=A | expected=DENIED | observed=DENIED | 42501 permission denied for table quiz_sessions
PASS | INSERT|A|quiz_sessions|self | expected=1 | observed=1 | - -
PASS | INSERT|A|quiz_sessions|owner=B | expected=DENIED | observed=DENIED | 42501 new row violates row-level security policy for table "quiz_sessions"
PASS | INSERT|B|quiz_sessions|self | expected=1 | observed=1 | - -
PASS | INSERT|anon|learning_goals|owner=A | expected=DENIED | observed=DENIED | 42501 permission denied for table learning_goals
PASS | INSERT|A|learning_goals|self | expected=1 | observed=1 | - -
PASS | INSERT|A|learning_goals|owner=B | expected=DENIED | observed=DENIED | 42501 new row violates row-level security policy for table "learning_goals"
PASS | INSERT|B|learning_goals|self | expected=1 | observed=1 | - -
PASS | INSERT|anon|ai_daily_usage|owner=A | expected=DENIED | observed=DENIED | 42501 permission denied for table ai_daily_usage
PASS | INSERT|A|ai_daily_usage|self | expected=1 | observed=1 | - -
PASS | INSERT|A|ai_daily_usage|owner=B | expected=DENIED | observed=DENIED | 42501 new row violates row-level security policy for table "ai_daily_usage"
PASS | INSERT|B|ai_daily_usage|self | expected=1 | observed=1 | - -
PASS | INSERT|anon|profiles|owner=E | expected=DENIED | observed=DENIED | 42501 permission denied for table profiles
PASS | INSERT|E|profiles|self | expected=1 | observed=1 | - -
PASS | INSERT|A|profiles|owner=E | expected=DENIED | observed=DENIED | 42501 new row violates row-level security policy for table "profiles"
PASS | UPDATE|anon|documents|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table documents
PASS | UPDATE|A|documents|row=A | expected=1 | observed=1 | - -
PASS | UPDATE|A|documents|row=B | expected=0 | observed=0 | - -
PASS | UPDATE|B|documents|row=B | expected=1 | observed=1 | - -
PASS | UPDATE|anon|document_chunks|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table document_chunks
PASS | UPDATE|A|document_chunks|row=A | expected=1 | observed=1 | - -
PASS | UPDATE|A|document_chunks|row=B | expected=0 | observed=0 | - -
PASS | UPDATE|B|document_chunks|row=B | expected=1 | observed=1 | - -
PASS | UPDATE|anon|user_progress|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table user_progress
PASS | UPDATE|A|user_progress|row=A | expected=1 | observed=1 | - -
PASS | UPDATE|A|user_progress|row=B | expected=0 | observed=0 | - -
PASS | UPDATE|B|user_progress|row=B | expected=1 | observed=1 | - -
PASS | UPDATE|anon|quiz_sessions|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table quiz_sessions
PASS | UPDATE|A|quiz_sessions|row=A | expected=1 | observed=1 | - -
PASS | UPDATE|A|quiz_sessions|row=B | expected=0 | observed=0 | - -
PASS | UPDATE|B|quiz_sessions|row=B | expected=1 | observed=1 | - -
PASS | UPDATE|anon|learning_goals|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table learning_goals
PASS | UPDATE|A|learning_goals|row=A | expected=1 | observed=1 | - -
PASS | UPDATE|A|learning_goals|row=B | expected=0 | observed=0 | - -
PASS | UPDATE|B|learning_goals|row=B | expected=1 | observed=1 | - -
PASS | UPDATE|anon|ai_daily_usage|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table ai_daily_usage
PASS | UPDATE|A|ai_daily_usage|row=A | expected=1 | observed=1 | - -
PASS | UPDATE|A|ai_daily_usage|row=B | expected=0 | observed=0 | - -
PASS | UPDATE|B|ai_daily_usage|row=B | expected=1 | observed=1 | - -
PASS | UPDATE|anon|profiles|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table profiles
PASS | UPDATE|A|profiles|row=A | expected=1 | observed=1 | - -
PASS | UPDATE|A|profiles|row=B | expected=0 | observed=0 | - -
PASS | UPDATE|B|profiles|row=B | expected=1 | observed=1 | - -
PASS | DELETE|anon|documents|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table documents
PASS | DELETE|A|documents|row=A | expected=1 | observed=1 | - -
PASS | DELETE|A|documents|row=B | expected=0 | observed=0 | - -
PASS | DELETE|B|documents|row=B | expected=1 | observed=1 | - -
PASS | DELETE|anon|document_chunks|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table document_chunks
PASS | DELETE|A|document_chunks|row=A | expected=1 | observed=1 | - -
PASS | DELETE|A|document_chunks|row=B | expected=0 | observed=0 | - -
PASS | DELETE|B|document_chunks|row=B | expected=1 | observed=1 | - -
PASS | DELETE|anon|user_progress|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table user_progress
PASS | DELETE|A|user_progress|row=A | expected=1 | observed=1 | - -
PASS | DELETE|A|user_progress|row=B | expected=0 | observed=0 | - -
PASS | DELETE|B|user_progress|row=B | expected=1 | observed=1 | - -
PASS | DELETE|anon|quiz_sessions|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table quiz_sessions
PASS | DELETE|A|quiz_sessions|row=A | expected=1 | observed=1 | - -
PASS | DELETE|A|quiz_sessions|row=B | expected=0 | observed=0 | - -
PASS | DELETE|B|quiz_sessions|row=B | expected=1 | observed=1 | - -
PASS | DELETE|anon|learning_goals|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table learning_goals
PASS | DELETE|A|learning_goals|row=A | expected=1 | observed=1 | - -
PASS | DELETE|A|learning_goals|row=B | expected=0 | observed=0 | - -
PASS | DELETE|B|learning_goals|row=B | expected=1 | observed=1 | - -
PASS | DELETE|anon|ai_daily_usage|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table ai_daily_usage
PASS | DELETE|A|ai_daily_usage|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table ai_daily_usage
PASS | DELETE|A|ai_daily_usage|row=B | expected=DENIED | observed=DENIED | 42501 permission denied for table ai_daily_usage
PASS | DELETE|B|ai_daily_usage|row=B | expected=DENIED | observed=DENIED | 42501 permission denied for table ai_daily_usage
PASS | DELETE|anon|profiles|row=A | expected=DENIED | observed=DENIED | 42501 permission denied for table profiles
PASS | DELETE|A|profiles|row=A | expected=1 | observed=1 | - -
PASS | DELETE|A|profiles|row=B | expected=0 | observed=0 | - -
PASS | DELETE|B|profiles|row=B | expected=1 | observed=1 | - -
RLS_MATRIX_SUMMARY total=104 fails=0
```

All `104/104` cases passed. Key invariants observed:

- `anon`: `42501 permission denied` on every user table (no anon grants) — fail closed.
- `user A` SELECT: exactly `1` row on every table (own row only); `user B` likewise; neither
  ever sees the other's row.
- INSERT: owner-mismatch attempts refused (`row-level security` / `42512`); owner-match
  attempts succeed (`1` row).
- UPDATE/DELETE: cross-user attempts affect `0` rows; owner attempts affect `1`.
- `ai_daily_usage`: no DELETE grant AND no DELETE policy — every DELETE refused with `42501`.

*(§5 privacy-through-RPC and §6 post-hardening loop recorded below.)*

---

## 5. OBSERVED two-user privacy through BOTH RPCs (real SQL)

Harness: **committed** at `supabase/tests/wave1_rpc_privacy.sql` — 9 self-checking cases against
`w1_chain_test`, both RPC signatures read from the live catalogue. `search_document_chunks_fts(text,text,text,text,text,int)` and
`match_document_chunks(vector,int,float,text,text,text,text,text)`. Both function bodies put the
ownership predicate **first, as an outer `AND`**: `WHERE user_id = auth.uid() AND ...`. The
`OR curriculum_scope = 'USER_PRIVATE'` clause is *inside* the curriculum-scope filter only — it
does not weaken ownership. Seed: A-private, B-private (identical text), A-shared
(`GLOBAL_OPEN`), all with a valid 384-dim embedding.

```
PASS | FTS|A|photosynthesis | expected=1 observed=1 | - -
PASS | FTS|B|photosynthesis | expected=1 observed=1 | - -
PASS | FTS|A|mismatched curriculum keeps USER_PRIVATE | expected=1 observed=1 | - -
PASS | FTS|A|no-claim caller | expected=0 observed=0 | - -
PASS | FTS|anon-role | expected=DENIED observed=DENIED | 42501 permission denied for function search_document_chunks_fts
PASS | VECTOR|A|all owned | expected=2 observed=2 | - -
PASS | VECTOR|B|all owned | expected=1 observed=1 | - -
PASS | VECTOR|A|no-claim caller | expected=0 observed=0 | - -
PASS | VECTOR|anon-role | expected=DENIED observed=DENIED | 42501 permission denied for table document_chunks
RPC_PRIVACY_SUMMARY total=9 fails=0
```

A sees only A's chunks (private **and** shared-owned), B only B's, a claim-less signed-in caller
sees zero, and the anon role is refused at the function/table grant layer. No cross-user row is
returned by either retrieval path.

---

## 6. OBSERVED post-hardening loop + token-less caller

### 6a. App-level loop (real modules, embedding model stubbed as unavailable)

New real-path test `tests/flows/postHardeningLoop.test.ts` chains the full loop on the production
submission path: `storeChunks` (12 embedding-less chunks, caller demanding `GLOBAL_OPEN` is
overridden) → `retrieveRelevantChunks` (ranked FTS RPC, cited result survives the 0.7 gate) →
`useProgressStore.addQuizScore` (persists a user-owned `quiz_sessions` row) →
`WeakPointMemory.identify` (only the signed-in learner's low-mastery node, correctly `high`
urgency; another user's node excluded).

```
$ npx vitest run -c vitest.config.js tests/flows/postHardeningLoop.test.ts
 Test Files  1 passed (1)    Tests  1 passed (1)
EXIT=0
```

### 6b. Token-less caller reads ONLY reference tables (real SQL)

```
anon SELECT legacy_subjects / legacy_topics (seeded):  subjects=1, topics=1
anon SELECT document_chunks:  ERROR 42501 permission denied for table document_chunks
```

Combined with §4 (anon refused on all 7 user tables), the unauthenticated surface is
reference-data-only — fail closed.

### 6c. Pre-existing governance harness re-run this session

```
$ bash scripts/security/run_rls_matrix_local.sh
rows=247 pass=247 fail=0 blocked=0
✅ local RLS matrix proof passed
EXIT=0
```

(Isolated Postgres 16 + PostgREST on ports 55441/55443; signed learner JWTs; no cloud access.
This proves the `20261104_rls_hardening.sql` migration, consistent with
`docs/security/RLS_MATRIX.md`.)

---

## 7. Exact staging → production migration order

**Two distinct cases. Never assume a from-zero reset works — see §1.**

### Case A — existing deployed project (staging and production)

These projects already have the historical migration set applied. Apply ONLY the two new
forward-only migrations, in filename order, via the Supabase SQL editor or `supabase db push`:

1. `supabase/migrations/20261117_private_import_fts.sql`
   — adds `document_chunks.content_tsv` (generated tsvector) + GIN index, the
   `search_document_chunks_fts` RPC, hardens the 8-arg `match_document_chunks`, and fixes
   EXECUTE grants (authenticated only; REVOKE from PUBLIC/anon). Idempotent DDL guards.
2. `supabase/migrations/20261117_relabel_user_chunks_private.sql`
   — `UPDATE document_chunks SET curriculum_scope='USER_PRIVATE' WHERE user_id IS NOT NULL AND
   curriculum_scope='GLOBAL_OPEN'`. Idempotent (second run = 0 rows). **Must run after step 1**
   so the scope vocabulary and RPCs are in place first.

Both were proven to apply cleanly in filename order on the throwaway Supabase PG 17 (§1b).
Order to verify after apply:

```
SELECT column_name FROM information_schema.columns
 WHERE table_name='document_chunks' AND column_name='content_tsv';           -- 1 row
SELECT indexname FROM pg_indexes
 WHERE tablename='document_chunks' AND indexname='document_chunks_content_tsv_idx';  -- 1 row
SELECT proname||'/'||pronargs FROM pg_proc
 WHERE proname IN ('search_document_chunks_fts','match_document_chunks');    -- 6-arg FTS + vector variants
SELECT count(*) FROM document_chunks
 WHERE user_id IS NOT NULL AND curriculum_scope='GLOBAL_OPEN';               -- 0 rows
```

Staging first: apply both, run the §4/§5/§6 checks against a staging JWT (owner-scoped), confirm
0 cross-user rows, then apply the identical two files to production in the same order. No
backfill of embeddings is required — retrieval is FTS-first and works without a model.

### Case B — fresh project from zero (NOT DONE — blocked by pre-existing migrations)

A literal `supabase db reset` is **NOT DONE** (§1). It fails at the 2nd migration because the
chain assumes `supabase/schema.sql`, which the CLI never applies. The local proof therefore
bootstrapped the canonical `schema.sql` first, then applied migrations with the 7 known legacy
conflicts tolerated (§2). Do not advertise from-zero reset as working.

**Named follow-up (separate project, out of Wave 1 scope):** repair the 7 historical migrations
listed in §1b so each is self-contained/idempotent and a clean `supabase db reset` from zero
succeeds; exit criterion is an unattended green reset plus an automated migration-order test.
