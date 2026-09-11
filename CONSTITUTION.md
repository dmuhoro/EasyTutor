# Constitution — EasyTutor

> Highest-authority engineering governance for this repository. Follows the
> same doctrine as the ecosystem's governing constitutions (ShrinkMedia /
> Kay's Wellness Centre / TraderOS / Brianna's OS) but scoped to an
> AI tutoring platform. Where this document and another ecosystem document
> disagree, this repository's source of truth is this document; cross-project
> claims must be cited from their owning repo (ShrinkMedia documentation
> doctrine).

---

## Preamble

EasyTutor exists to give a learner **a personal tutor that actually works** —
sign up, pick a subject, chat with an AI tutor, take a quiz, and watch mastery
grow. Its non-negotiable posture, inherited from the ecosystem, is
**execution safety**: on a platform that guides a student's learning and
eventually handles payments, a single silent failure can misdirect a learner,
lose progress, or destroy trust. Every article below is written to make
"fail closed, never fail open" concrete for this product.

---

## Article I — Execution-Safety Guarantees

1. **Never let code claim a protection it does not actually provide.** An
   "evidence" gate that can pass while the real production path stays
   unguarded, a portal check that does not run on the live query path, or a
   "verified" pipeline that tests a different path is worse than no
   protection. If a claim can pass while the real path stays unguarded, the
   work is not done.
2. **Enforcement lives at the real boundary.** Before any "wire X into the
   learner path" acceptance, read the actual code and find the true path
   (e.g. the `buildPortalScopedQuery` / `executeGovernedWrite` calls in
   `src/infrastructure/database/`, the AI routing in `lib/aiProvider.ts`).
   Insert protection there — never only in a helper the tests or demo path
   use. Verify the premise against the code first.
3. **Fail closed, never fail open.** Defaults refuse. Portal scope defaults to
   the conservative learner portal. A query with no resolved tenant returns no
   rows, not all rows. When unsure, choose the conservative outcome.
4. **Proof must exercise the real path.** A unit test of a standalone engine
   does not prove wiring. Tests must assert that the real governed write /
   router call is guarded before data or AI responses change state.
5. **Say no early, loudly.** If a plan inserts protection at the wrong point,
   proposes a gate that can be bypassed, or expands scope against its own
   constraints, say so explicitly and propose the corrected version before
   executing.
6. **No silent drops.** Rejections are explicit: the caller gets a clear
   reason, an audit record, and a metric/visible state. Learner progress,
   quiz results, and AI failures are never silently swallowed.

## Article II — Learner-Data Integrity

1. Mastery, streaks, momentum, and progress estimates are computed
   deterministically in one aggregation layer; the AI narrates numbers and
   explanations — it never fabricates facts about the learner's state.
2. Local-first is canonical: the device store (`AsyncStorage`/local stores) is
   the source of truth while offline; Supabase sync is idempotent and
   conflict-safe. No record is marked synced until the write path succeeds.
3. Money arithmetic (if payment/commerce is reintroduced) is never raw float
   math; aggregation rounds deterministically. Commerce code currently lives
   in `archive/lib/commerce` and must not re-enter `lib/` without a spec.
4. Deleting state is explicit. No user-data path clears progress without a
   labeled, confirmed action.

## Article III — Portal & Tenant Scoping

1. Every governed read/write resolves a portal (`high_school` / `university` /
   `knowledge_explorer`) through `portalFromMode(learningMode)` — never a
   hardcoded magic string like `'student'`.
2. A query whose portal cannot be resolved fails closed (no rows), never
   opens scope to another tenant.
3. Supabase RLS is the last line of defense; the app's governed query layer is
   the first. Both must agree. Architecture boundary validation
   (`scripts/architecture/validate_boundaries.js`) must stay green.

## Article IV — AI Integrity & Routing

1. AI responses go through a reliability wrapper (timeouts, retries,
   multi-provider fallback) and a routing path (`lib/aiProvider.ts`,
   `src/intelligence/routing/`) that returns the source used
   (`cache` / `local` / `cloud` / `offline_fallback`).
2. A failed or timed-out AI call never pretends to be an answer. The learner
   sees a clear retry/fallback state.
3. The canonical model for EasyTutor's hosted experience is the Tutor model
   set in env-config (default: Claude) ; local/offline builds may fall back to
   Ollama. Claims about "which model is live" are stated in STATUS.md, never
   assumed.

## Article V — Security

1. Secrets are never committed. Env vars reference names, never raw tokens,
   and `.env.example` documents names only. Local key material lives in
   `store/settingsStore` and `AsyncStorage`, never in source.
2. `.env*.local`, `*.pem`, `*.key`, and service-role material are
   git-ignored. Commits are scanned before push.
3. Any future auth/payment surface is server-side, fail-closed by default.

## Article VI — Testing & Evidence

1. Green before push: typecheck, lint, tests, architecture boundary audit,
   QA runner (`scripts/qa/qa_runner.js`), and the production web export
   (`npx expo export --platform web`).
2. New logic has adversarial tests — the forbidden path is tested, not just
   the happy path. Never weaken a test to make a build pass.
3. Every sprint writes `docs/sprints/` + `docs/evidence/` entries before it is
   considered done, and updates `STATUS.md` + `CHANGELOG.md`.
4. "What's live / what's stubbed / what's blocked" claims in `STATUS.md` are
   stated and verified, not trusted.

## Article VII — Pareto Execution

1. Work sequentially in layers; finish one layer before starting the next.
2. Solve the 20% that delivers 80% of value (the core loop: sign-up → subject
   → tutor → quiz → progress, on Expo Go) before polishing the long tail.
3. Keep scope tight. One honest gap closed beats five half-verified claims.
4. Honesty over optimism: closing one gap never means "risk is complete" —
   record what remains in `STATUS.md`.

## Ratification

Ratified 2026-09-11. Codifies the execution-safety doctrine already enforced
in this session (portal bug removal, dead-dependency build fix, on-path
restoration of learning engines, archive-not-delete policy).