# E1 consolidation into the Completion Register (2026-11-24)

Branch `fix/ai-proxy-cors`, after `git merge origin/main` (merge commit `64fc982`).

## What was executed

- `git merge origin/main` brought R0's register, scorer, sprint 43 closure rows and the five
  previously verified rows onto the CORS branch. `CHANGELOG.md` and `STATUS.md` had content
  conflicts; both sides were retained verbatim (no section dropped, no assertion changed).
- `npm run test -- tests/flows/aiProxy.cors.test.ts` — **1 file / 7 tests passed**. The suite
  exercises the real Web-standard handler: exact-match origin reflection, `Vary: Origin`, CORS on
  error paths, preflight 204, and rejected unknown origins. It was already red→green proven when
  E1 was implemented (see `docs/evidence/E1-cors.md`).
- `grep -q ALLOWED_ORIGINS .env.example` — exit 0; the allowlist name is present in the tracked
  example env file (value is empty, as it must be — no secret is committed).
- `npm run readiness:score` and `npm run readiness:check` — exit 0; register valid at 153 rows.
- `npm test` — **96 files / 538 tests passed**. `AGENTS.md` GT-21 inventory corrected from
  92/515 to the actually executed 96/538.

## Rows advanced

| Row | Before | After | Proof |
|---|---|---|---|
| C12 Proxy CORS for web/PWA | MISSING | VERIFIED-LOCAL | 7/7 CORS handler tests |
| GT-01 Web cannot call hosted AI | MISSING | VERIFIED-LOCAL | same suite |
| E1-T1 ALLOWED_ORIGINS exact match | MISSING | VERIFIED-LOCAL | same suite + tracked `.env.example` entry |

PILOT **17.7 → 20.0 %** (`48.10/241`, open P0 27 → 24). V1-ACADEMIC 5.2 %, V1-POLYMATH 14.4 % and
WORLD-CLASS 10.5 % are unchanged; all four remain `READY=NO`.

## Not claimed

- No `VERIFIED-IN-CI` status was assigned here (CI re-runs after push; status is recorded only once
  the head is green).
- Deploying the `ALLOWED_ORIGINS` secret and making a live hosted call remain Daniel-only steps
  (D02/D05). The CORS row proves handler behaviour, not deployment.
- No threshold, budget, timeout or assertion was changed; no test was skipped, renamed or deleted.
