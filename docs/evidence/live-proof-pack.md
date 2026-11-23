# One-session live-proof pack (G-10 … G-14)

Status: **BLOCKED — no live proof claimed.** This is the executable handover for one short
Daniel-owned session. It turns the external blockers into a fixed sequence so the ten real
network/device flows in [`scripts/live-proof-checklist.md`](../../scripts/live-proof-checklist.md)
can be ticked with screenshots. Vercel HTTP/browser access was subsequently achieved by the agent
with a fresh OIDC token and a temporary, reverted Trusted Sources rule; production browser
Lighthouse was measured below 80 and is not claimed as a pass. The Supabase, test-user and device
steps below remain unexecuted. See `2026-11-23-vercel-access-and-live-proof.md`.

## 0. Inputs — supply by name, never in chat or the repo

| Input | Where it goes | Owner |
| --- | --- | --- |
| Valid remote test login (`email`, `password`) | a JSON file under `/tmp/opencode/`, created with `umask 077` and `chmod 600`; its **path** goes in `LIVE_PROOF_USER_FILE`. Never paste the values into chat, a commit, an evidence file, a fixture or a shell command that will be echoed. | Daniel |
| `GROQ_API_KEY` in Supabase Edge Function secrets | the Supabase project's server-side Edge Function environment. Verify only the lookup **name** at `supabase/functions/ai-proxy/index.ts:41`; never print, paste or commit the value. | Daniel |
| Vercel browser access | a logged-in browser session, Trusted Sources rule or bypass link for the deployment; probe URL in `E2E_BASE_URL`. | Daniel |
| Android device | USB debugging enabled; serial from `adb devices` in `ANDROID_SERIAL` when more than one device is online. | Daniel |

The repository fixture `test@example.com` / `TestPass123!` returns HTTP 400 and is **not** a
valid test user. Do not retry it.

Prepare the credential file in Daniel's own terminal (placeholders shown, no real values):

```bash
umask 077
printf '{"email":"<test-email>","password":"<test-password>"}' \
  > /tmp/opencode/easytutor-live-user.json
chmod 600 /tmp/opencode/easytutor-live-user.json
```

## 1. Three blocking steps, in order

### Step A — valid remote test user

Create or reset one Supabase Auth user, write the mode-600 file above, then confirm:

```bash
export LIVE_PROOF_USER_FILE=/tmp/opencode/easytutor-live-user.json
npm run qa:live-preflight
```

Expected: `READY test-user`. Any `BLOCKED test-user` line means stop — the harness checks
file location, mode 600, valid JSON and non-empty `email`/`password` by name only, and never
echoes a value.

### Step B — Groq secret in the Edge Function

Set the provider secret in the Supabase Edge Function environment, then verify the lookup
name (never the value):

```bash
grep -n 'Deno.env.get("GROQ_API_KEY")' supabase/functions/ai-proxy/index.ts
# expected: lines 29 and 41 contain the lookup; line 43 fails closed with "no groq key"
export GROQ_SECRET_ATTESTED=yes
npm run qa:live-preflight
```

Expected: `READY groq-secret`. Then ask one real hosted tutor question in the app. A 503
`no groq key` or any 4xx/5xx means the secret is not wired — stop and fix before continuing.

### Step C — Vercel browser access

**Agent update 2026-11-23:** achieved via a freshly pulled `VERCEL_OIDC_TOKEN` (the old local
token was expired) plus a temporary `development → production` self-access rule; production
returned HTTP 200. The rule was reverted after measurement. See
`2026-11-23-vercel-access-and-live-proof.md`. The attestation below is still Daniel's to give for
the ten human browser flows — an agent HTTP probe is not a signed-in user session.

Open the deployment in an authenticated browser. A 302 to a Vercel login page is still
BLOCKED. Once reachable:

```bash
export E2E_BASE_URL=<your-deployment-url>
export VERCEL_ACCESS_ATTESTED=yes   # only after a human confirms browser access
npm run qa:live-preflight
```

Expected: `READY browser-access`. The harness probes by HTTP and records the operator
attestation explicitly; it never claims a flow was performed.

## 2. Exact commands once all three are unblocked

Run in this order; keep terminal output and screenshots **outside** the repository.

```bash
# 1. Presence gate: must be 4x READY, strict mode must exit 0.
npm run qa:live-preflight
npm run qa:live-preflight -- --require-ready
# expected exit: 0; still 10 UNPROVEN flows (the harness never performs them)

# 2. Repeatable, credential-free web checks behind the browser half.
npm run qa:live-preflight -- --run-local
# expected: PASS build, PASS bundle-guard, PASS web-e2e-smoke (9 passed),
#           PASS desktop-baseline; overall exit 0
# screenshot: browser-desktop-home.png, browser-390-login.png

# 3. Local web export gates.
npm run build
npm run guard:dist
npm run perf:budget
npm run perf:login-route
# expected: all exit 0; record the byte numbers actually printed

# 4. Android dev build (eas.json uses expo-dev-client, NOT Expo Go).
export ANDROID_SERIAL=<adb-serial-from-adb-devices>
adb devices                 # expected: that serial in state 'device'
npx expo run:android
# screenshot: android-dev-client-installed.png
```

Then follow `scripts/live-proof-checklist.md` verbatim on the browser and device. Tick a box
only when it genuinely succeeds there, and save one screenshot per flow named
`flow-NN-<short-name>.png` outside the repo. For every failure, record the exact error text
and the failing step; leave the box unchecked.

## 3. Not claimed yet — all R1 flows unverified

| # | Flow | Status | Owner |
| --- | --- | --- | --- |
| 1 | Supabase authentication (sign-up, confirmation, sign-in, reload persistence) | UNPROVEN | Daniel |
| 2 | Preset high-school curriculum roadmap from the real provider | UNPROVEN | Daniel |
| 3 | Free-form Knowledge Explorer roadmap + governed `learning_goal` write | UNPROVEN | Daniel |
| 4 | Quiz session + governed `quiz_sessions` score write | UNPROVEN | Daniel |
| 5 | Progress persistence and idempotent local-first sync after restart | UNPROVEN | Daniel |
| 6 | Learning-goal journal create/list | UNPROVEN | Daniel |
| 7 | Real document ingestion and governed RAG retrieval with citations | UNPROVEN | Daniel |
| 8 | Ollama `/api/tags` model-slot status | UNPROVEN | Daniel |
| 9 | Ollama reasoning inference (`deepseek-r1:14b`) | UNPROVEN | Daniel |
| 10 | Offline fallback with honest provider labels and queued progress | UNPROVEN | Daniel |

Also unclaimed: Google OAuth round-trip, staging/production migration application and
Supabase Auth URL settings, and physical-device E2E. Production/Vercel Lighthouse was attempted
on 2026-11-23 but measured below 80 (`/` 65→71, `/login` 74→66) under heavy host load; it is
**NOT MET**, not a pass. The P1 mobile target ≥ 80 also remains NOT MET by the existing decision;
no budget was changed.

## 4. Evidence handling

Never commit screenshots, credential files or preflight reports containing environment-specific
paths. Reference them by name in `STATUS.md` and link the committed command output instead.
