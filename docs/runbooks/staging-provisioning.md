# Staging provisioning runbook (Daniel-only)

**Status:** RUNBOOK READY · **NOT EXECUTED** · NO REGISTER ROW PROMOTED

This runbook exists so the three `readiness:next` rows are unblocked as far as
an agent can unblock them. The gates themselves remain red:

| Row | Gate | Why an agent cannot close it |
|---|---|---|
| `C45` / `D03` | `test -f docs/evidence/daniel-D03.md` | `supabase projects list` returns `Invalid access token`; cloud Supabase is Daniel-only per `docs/ROADMAP-TO-FINAL.md` §(iii). |
| `DEC-02` | `test -f docs/evidence/DEC-02.md` | Named-reviewer decision; proposal at `docs/decisions/DEC-02-curriculum-priority-proposal.md`. |
| `DEC-03` | `test -f docs/evidence/DEC-03.md` | Performance-target decision; proposal at `docs/decisions/DEC-03-performance-targets-proposal.md`. |
| `D04` | `test -f docs/evidence/daniel-D04.md` | Vercel project + protection is Daniel-only. |
| `D02` | `test -f docs/evidence/daniel-D02.md` | Needs real origins and a deployed proxy with hosted keys. |
| `D10` | `test -f docs/evidence/daniel-D10.md` | OAuth callback and production auth URLs are Daniel-only. |
| `D05` | `test -f docs/evidence/daniel-D05.md` | One live hosted AI call with real credentials. |

No `docs/evidence/daniel-*.md` and no `docs/evidence/DEC-*.md` file was created
by the agent. Creating one would make a file-existence gate pass without the
infrastructure or decision existing — a false gate, forbidden by Constitution
Article I and SOP "Never weaken a gate to go green".

## Order of operations (strictly sequential)

### 1. Decide first (no credentials needed)
Ratify `DEC-01`, `DEC-02`, `DEC-03` from the proposals in `docs/decisions/`.
Write the signed records to `docs/evidence/DEC-01.md`, `DEC-02.md`, `DEC-03.md`.
Only then may those register rows leave `MISSING`.

### 2. Supabase staging (`D03`, closes `C45`)
- Authenticate the Supabase CLI with Daniel's account: `supabase login`.
  The agent session currently has an invalid access token; do **not** paste a
  token into chat, a commit, or an evidence file.
- Create the staging project, then link it in a clean working tree:
  `supabase link --project-ref <STAGING_REF>`.
- Apply the same migrations CI applies: `supabase db reset --linked`.
  Migrations live in `supabase/migrations/`. Do **not** invent new SQL here.
- Verify governance: `npm run audit:governance` and the RLS matrix job.
- Write `docs/evidence/daniel-D03.md` containing only the project ref, the
  migration count and the passing command outputs — **never** a key, URL with
  credentials, or service-role token.

### 3. Vercel staging (`D04`)
- Create a staging project from the same `main` commit; keep `vercel.json`
  unchanged (the 733,000 B login ratchet is enforced in build env).
- Enable deployment protection on staging.
- Attach only non-secret config here. Secrets go through `vercel env add` from
  Daniel's authenticated session, never into the repo.
- Write `docs/evidence/daniel-D04.md` with the project name, protected preview
  URL and the passing check run URL.

### 4. Hosted AI proxy (`D02`)
- Deploy `supabase/functions/ai-proxy` to the staging project.
- Set `ALLOWED_ORIGINS` to the **real** staging and production origins only.
  Never use `*`; the E1 CORS contract is fail-closed.
- Verify `npm run check:ai-boundary` still passes.
- Write `docs/evidence/daniel-D02.md` naming the origins configured and the
  verified command output. Prove the *name* and lookup, never the secret value.

### 5. Auth URLs (`D10`) and live proof (`D05`)
- Set production auth URLs and the Google OAuth callback to the real domains.
- Make one live hosted AI call through the staged proxy; record the rail,
  latency and token-derived cost in `docs/evidence/daniel-D05.md`.
- Write `docs/evidence/daniel-D10.md` with the configured callback URLs.

### 6. Rotate the exposed Stitch key (`D01`)
- Rotate in the provider first; assume the old value is compromised.
- Update only the server-side secret store / `vercel env`. Never commit it.
- Write `docs/evidence/daniel-D01.md` proving the rotation by name, not value.

## What the agent already proved locally

Full gate green on merged `main` (`0ea513c`): typecheck 0, lint 0, 112 files /
596 tests, boundaries 0, governance 0, AI boundary PASS, declared imports PASS,
readiness valid, build 0, QA SUCCESS, `audit:full` PASS, login 732,974 /
733,000 B PASS. None of these gates prove staged infrastructure or a live AI
call; they are hermetic by design (`docs/ROADMAP-TO-FINAL.md` §(v) item 3).
