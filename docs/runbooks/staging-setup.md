# Staging setup — exact commands (Daniel-only execution)

**Status:** RUNBOOK READY · **NOT EXECUTED** · NO ROW PROMOTED BY THIS FILE
**Canonical runbook:** `docs/runbooks/staging-provisioning.md` (that file owns
the order and the "why an agent cannot close it" table; this file is its
command-level companion for the weekend).
**Spec:** `sprints/sprint_86_pilot_ready.md` WS1.

> Every value in `<ANGLE_BRACKETS>` is typed by Daniel in his own authenticated
> session. Never paste a key, token, password, service-role credential or a
> learner's personal data into chat, a commit, a fixture, an evidence file or a
> shell command that will be echoed. Prove the **name** and the lookup, never
> the value.

## 0. Inputs (by name only)

| Input | Goes to | Owner |
|---|---|---|
| Supabase account with project-create rights | `supabase login` | Daniel |
| `<STAGING_REF>` | `supabase link --project-ref` | Daniel |
| `GROQ_API_KEY` | Supabase Edge secret | Daniel |
| `<STAGING_ORIGIN>` and `<PRODUCTION_ORIGIN>` | `ALLOWED_ORIGINS` — exact origins, **no wildcard** | Daniel |
| Public Supabase URL + anon key | Vercel staging env (non-secret config only) | Daniel |
| Auth site URL + redirect URLs, Google OAuth callback | Supabase Auth / Google console | Daniel |
| `<STAGING_TEST_EMAIL>` / `<STAGING_TEST_PASSWORD>` | `/tmp/opencode/` file, `umask 077`, `chmod 600`; only the **path** in `LIVE_PROOF_USER_FILE` | Daniel |
| 10 pilot accounts, auto-confirm | Supabase staging Auth | Daniel |
| Alert destination + billing dashboard | `docs/evidence/daniel-D15.md` | Daniel |

## 1. Decide first (no credentials needed)

Ratify `DEC-01`…`DEC-05` from `docs/decisions/proposals/` and write the signed
records to `docs/evidence/DEC-01.md` … `DEC-05.md`. `D16` must be recorded
before `DEC-01`; `D07` before `DEC-05`. The agent never creates these files.

## 2. Supabase staging (`D03`, closes `C45`)

```bash
supabase login
supabase link --project-ref <STAGING_REF>
supabase db reset --linked          # canonical: same migrations CI applies
```

For an already-linked and already-migrated project only, `supabase db push`
applies incremental migrations. A fresh staging project uses `db reset
--linked`; the existing runbook's command wins where the two differ.

```bash
npm run audit:governance
# RLS matrix job in CI (247 assertions) must be green on this main SHA
```

Write `docs/evidence/daniel-D03.md` with: the project ref, the migration count
and the passing command outputs. No key, credential URL or service-role token.

## 3. Vercel staging (`D04`)

- Create the staging project from the **same `main` SHA** used for the smoke run.
- Leave `vercel.json` unchanged: the 733,000 B login ratchet is enforced in
  build env.
- Enable deployment protection on staging.
- Write `docs/evidence/daniel-D04.md` with the project name, protected preview
  URL and the passing check-run URL.

## 4. Hosted AI proxy (`D02`)

```bash
supabase secrets set GROQ_API_KEY=<value>
supabase secrets set ALLOWED_ORIGINS=<STAGING_ORIGIN>,<PRODUCTION_ORIGIN>
supabase functions deploy ai-proxy
npm run check:ai-boundary
```

`ALLOWED_ORIGINS` is an exact-match allowlist; `*` is forbidden. The local
preflight already returned exact ACAO for both Vercel origins and none for
`https://evil.example` — that is local proof only, not staged proof.

Write `docs/evidence/daniel-D02.md` naming the configured origins and the
verified command output.

## 5. Auth (`D10`) and live AI call (`D05`)

- Set the Auth site URL and redirect URLs to the real staging/production domains.
- Set the Google OAuth callback to the real domain.
- Create one dedicated auto-confirm staging test user; pre-provision the 10
  pilot accounts with auto-confirm (built-in email cannot absorb a burst of
  confirmations; custom SMTP is a later fix).
- Make one live hosted AI call through the staged proxy; record rail, latency
  and token-derived cost in `docs/evidence/daniel-D05.md`.
- Write `docs/evidence/daniel-D10.md` with the configured callback URLs.

## 6. CI secrets (names only)

`STAGING_URL`, `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`,
`STAGING_TEST_EMAIL`, `STAGING_TEST_PASSWORD`. Daniel sets them in GitHub; the
agent only references them by name in the workflow.

## 7. Rotate the exposed Stitch key (`D01`)

Rotate in the provider first and assume the old value is compromised. Update
only the server-side secret store / `vercel env`. Write
`docs/evidence/daniel-D01.md` proving rotation by name, never value.

## 8. Cloud smoke gate

After Daniel confirms the secrets:

```bash
gh workflow run staging-smoke.yml --ref main
```

`C45`, `D03` and `D02` move to `VERIFIED-IN-CI` only on a green run URL for
the exact `main` SHA, plus `npm run readiness:check` on that SHA.
`scripts/smoke/cloud.mjs` prints statuses and timings only; it masks secrets
and never echoes response bodies.
