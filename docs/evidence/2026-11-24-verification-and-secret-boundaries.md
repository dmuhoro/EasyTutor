# 2026-11-24 — Secret-boundary verification, full gate run and device check

## Scope

Daniel asked for (1) safe CLI commands to add the Groq key so nothing that should be secret is
exposed, and (2) all verification steps with the newly attached Android device so the remaining
gap to the final product state is explicit. This record contains only verified outcomes; no
secret value, token or one-time code is included.

---

## 1. The real secret boundary (read from code, not assumed)

| Check | Evidence | Result |
| --- | --- | --- |
| Where the Groq key is read | `supabase/functions/ai-proxy/index.ts:29` (health), `:41` (main), `:95` (upstream auth header) — all `Deno.env.get("GROQ_API_KEY")` | **Server-side only**, inside the Supabase Edge Function |
| What the client sends | `lib/ai/providers.ts:46-60` — `callAIProxy` posts to `<SUPABASE_URL>/functions/v1/ai-proxy` with only the learner's Supabase JWT; comment at `:57` states no client API key | **No Groq key leaves the device** |
| Direct-from-client Groq rail | `grep` over `*.ts/tsx/js/jsx/mjs`: only `supabase/functions/ai-proxy/{index,health}.ts` and the QA assertion in `scripts/qa/live_proof_harness.mjs:104-105` | Absent from shipped code |
| Vercel env surface | `vercel env ls`: only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Preview + Production) | **No Groq key on Vercel** — correct |
| Local env | `.env.local` (git-ignored) still contains one stale `EXPO_PUBLIC_GROQ_API_KEY` name; name-only count checked, value never printed | Stale, unused, must be removed locally (command below) |
| Guards | `npm run guard:secrets` (450 files) and `npm run guard:dist` (495 files incl. `dist/`) | PASS |

**Conclusion:** the Groq credential has exactly one correct home — Supabase Edge Function secrets.
Putting it on Vercel would be wrong and dangerous: this project is a **static web export**, so any
`EXPO_PUBLIC_*` value is inlined into the public JS bundle.

---

## 2. Commands for Daniel (run in his own terminal; values never in chat)

### 2.1 Supabase — the only place the Groq key belongs

```bash
# 0. Only if not already linked/authenticated. Replace the placeholder with a real
#    user-scoped token in your own terminal; never paste the token into chat.
#    supabase login --token YOUR_REAL_TOKEN

# 1. Read the key without echoing it, and keep it out of shell history.
read -r -s -p 'GROQ_API_KEY: ' GROQ_API_KEY; echo

# 2. Set it as an Edge Function secret for the real project.
#    --remote replaces the deprecated --project-ref; --yes is required because the
#    CLI refuses hosted production mutations in agent mode without it.
supabase secrets set GROQ_API_KEY="$GROQ_API_KEY" --remote=iypolnvuwgdxzxviyxqr --yes

# 3. Remove it from this shell immediately.
unset GROQ_API_KEY

# 4. Prove the NAME exists without printing any value (grep -q prints nothing).
supabase secrets list --remote=iypolnvuwgdxzxviyxqr --output-format json \
  | grep -q 'GROQ_API_KEY' \
  && echo 'GROQ_API_KEY present (value not shown)' \
  || echo 'GROQ_API_KEY MISSING'
```

The server reads the same name at `supabase/functions/ai-proxy/index.ts:41`; the function fails
closed with HTTP 503 when it is absent (`:43`). The health endpoint
`GET /functions/v1/ai-proxy/health` also checks it without echoing it.

### 2.2 Vercel — do NOT add the Groq key

No Vercel command is needed. The client only needs the two existing public values
(`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — the anon key is public by design
and protected by RLS). If a stale public Groq name is ever found there, remove it:

```bash
vercel env rm EXPO_PUBLIC_GROQ_API_KEY --yes        # only if it exists; it does not today
```

Removing the stale local name (git-ignored file, no value printed):

```bash
sed -i '/^EXPO_PUBLIC_GROQ_API_KEY=/d' .env.local
```

`SUPABASE_SERVICE_ROLE_KEY` and `GROQ_API_KEY` must never be set in Vercel or any `EXPO_PUBLIC_*`
variable.

### 2.3 First user attempt — observed failure and corrected runbook

Daniel ran the first version of these commands. Outcomes, verbatim in substance:

- `supabase login --token <USER_SCOPED_SUPABASE_TOKEN>` → `bash: syntax error near unexpected token
  'newline'` (the `<...>` placeholder was pasted literally and parsed as redirection). Login was
  in any case unnecessary: the project was already linked and authenticated.
- `supabase secrets set GROQ_API_KEY="$GROQ_API_KEY" --project-ref …` → warning that
  `--project-ref` is deprecated, then
  `HostedMutationConsentRequiredError: Confirmation required: Set 1 secret … This run can't ask
  because it is running in agent mode. Nothing was changed.` The CLI suggested re-running with
  `--yes`. **The key was not written.**
- The name-only check therefore correctly printed `GROQ_API_KEY MISSING`.
- The `sed` cleanup line produced a syntax error because the preceding explanatory comment
  containing parentheses was pasted into bash as well.
- `supabase login` / `npx supabase login` → `NonInteractiveError: Cannot prompt for input in JSON
  output mode`. Not needed for the secret write.

Corrected, paste-one-line-at-a-time runbook (re-enter the key because the shell variable was
unset after the failed attempt — never re-run `set` with an empty variable):

```bash
read -r -s -p 'GROQ_API_KEY: ' GROQ_API_KEY; echo
supabase secrets set GROQ_API_KEY="$GROQ_API_KEY" --remote=iypolnvuwgdxzxviyxqr --yes
unset GROQ_API_KEY
supabase secrets list --remote=iypolnvuwgdxzxviyxqr --output-format json | grep -q 'GROQ_API_KEY' && echo 'GROQ_API_KEY present (value not shown)' || echo 'GROQ_API_KEY MISSING'
sed -i '/^EXPO_PUBLIC_GROQ_API_KEY=/d' .env.local
```

Status at this point: **Groq secret still absent in the remote project**; owner Daniel.

### 2.4 Second user attempt — stale credential

Daniel re-ran the corrected command with a freshly read key. The CLI confirmed the intended
mutation (`Confirmed by --yes: Set 1 secret on project easytutor …`) but the API rejected it:

```
SecretsSetUnexpectedStatusError: Unexpected error setting project secrets:
{"message":"Invalid access token"}
```

The subsequent name-only check again reported `GROQ_API_KEY MISSING` — correct, because nothing
was written. Cause: the cached Supabase credential is stale for writes (reads still succeed).
Inspection of this environment shows `AGENT` and `AI_AGENT` set, which forces the CLI into agent
mode (explaining the earlier refusals to prompt), and no auth file under `~/.supabase/`.

Fix — obtain a fresh personal access token from
`https://supabase.com/dashboard/account/tokens`, then, one line at a time:

```bash
read -r -s -p 'SUPABASE_ACCESS_TOKEN: ' SUPABASE_ACCESS_TOKEN; echo
supabase login --token "$SUPABASE_ACCESS_TOKEN"
unset SUPABASE_ACCESS_TOKEN
```

Alternative on a desktop with a browser: `supabase --agent no --output pretty login` and approve
the browser flow. Then repeat the four-line key-set runbook from §2.3. Status unchanged:
**remote Groq key absent; written confirmation still MISSING**; owner Daniel.

---

## 3. Full verification run (this session, `main` @ `0417c05`)

| Gate | Command | Exit | Result |
| --- | --- | --- | --- |
| Typecheck | `npm run typecheck` | 0 | 0 errors |
| Lint | `npm run lint` | 0 | 0 errors / 148 warnings (pre-existing) |
| Unit/flow tests | `npm test` | 0 | 92 files / 515 tests passed |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | 0 | 0 violations |
| AI boundary | `node scripts/qa/check-ai-boundary.mjs` | 0 | PASS — no disabled direct rail call |
| Secret guards | `npm run guard:secrets` | 0 | 450 files scanned; 2 public env names allowlisted |
| Dist secret guard | `npm run guard:dist` | 0 | 495 files incl. exported bundle |
| Web export | `npm run build` | 0 | `dist/` exported + PWA assets injected; entry `entry-c54585ef…` |
| Entry budget | `npm run perf:budget` | 0 | gzip 437,683 / 450,000 B; raw 1,673,906 / 1,750,000 B; 39 route chunks |
| Login-route budget | `npm run perf:login-route` | 0 | 732,759 / 733,000 B transferred (241 B headroom) |
| E2E smoke | `npm run e2e:smoke` | 0 | 9/9 passed |
| QA runner | `node scripts/qa/qa_runner.js` | 0 | All systems verified |
| Full audit | `npm run audit:full` | 0 | All verification steps passed (`audits/full-audit-2026-11-24_08-09-28.txt`) |
| Desktop Lighthouse gate | `npm run perf:lighthouse` | **1** | **FAIL CLOSED** `/` 72, `/login` 67 (min 80), TBT 490/650 ms |
| Live-proof preflight | `npm run qa:live-preflight` | 0 | android-device **READY**; test-user / browser-access / groq-secret **BLOCKED**; 10 flows UNPROVEN |

The Lighthouse gate failed correctly, not silently: host load average was 5.83 with two
long-lived user-owned Chrome processes left running (not terminated by the agent). This is the
same load-sensitive behaviour already recorded in `2026-11-23-release-1.16.0.md` and
`2026-11-23-vercel-access-and-live-proof.md`. **No threshold, budget, timeout or assertion was
changed.** The previously verified five-run local-export result (`/` 89–92, `/login` 90–92) is
not retracted; today's two failing runs are honestly added to the record.

---

## 4. Device

- Attached: `49IZ6DJ7SONNQOBE`, Redmi `25078RA3EA`, Android 16, USB.
- Live-preflight now marks `android-device` **READY** (previous sessions: no device).
- Android SDK (`platforms/android-35,36`, build-tools 34/35) and JDK 21 are installed; default
  JDK is 25, so the build was explicitly pinned to `JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64`.
- First `expo run:android --device <serial>` failed: `--device` expects a device *name*, not a
  serial (`CommandError: Could not find device with name: 49IZ6DJ7SONNQOBE`). Retried with
  auto-detection (single device attached).
- The auto-detected build ran Gradle for 3m31s and then **failed**:
  `[CXX1101] NDK at /home/daniel-muhoro/android-cmdline-tools/ndk/27.1.12297006 did not have a
  source.properties file`. Inspection showed that directory contains only an empty `.installer`
  stub — the required NDK was never installed. This is a local toolchain defect, not a project
  code defect; no APK was produced and no app was installed.
- Repair succeeded: `sdkmanager --sdk_root="$ANDROID_HOME" "ndk;27.1.12297006"` installed NDK
  r27b (2.0 GB) with a valid `source.properties`; the next Gradle configure succeeded and
  reported `ndk: 27.1.12297006`.
- That build then failed on **network/TLS**, not code: Gradle could not download
  `com.android.tools.build:gradle:7.3.1`, `builder:7.3.1`, `bundletool:1.9.0` and others from
  Google Maven / Maven Central — `Remote host terminated the handshake`. Direct `curl` to the
  two representative artifact URLs returned HTTP 200 immediately afterwards, so the failure was
  transient or Gradle-specific.
- A second retry was started. After 12+ minutes the Gradle daemon was still at ~29% CPU but the
  log had not advanced for over 12 minutes; no APK was produced and no app was installed.
  **Device proof remains UNPROVEN** — no native build has been shown to succeed on this host.

---

## 5. Gap to final state

From `docs/COMPLETION_TRACKER.md` (the canonical backlog), unchanged by this verification run:

| Bar | Status |
| --- | --- |
| R1 core loop on real network (10/10 flows) | **NOT MET** — 0/10 ticked |
| R2 no fake data on wired paths | **NOT MET** (G-01/G-02 fixed at gate level, live proof still open) |
| R3 truthful/deterministic gates | **NOT MET** (G-03/04/05 fixed at gate level; G-06 flake open) |
| R4 usable on Android + 390 px + desktop | **NOT MET** — device now attached, E2E still unproven |
| R5 portrait lock / responsive shell | **NOT MET** (shell fixed, route/hover proof open) |
| R6 Lighthouse ≥80 | Desktop MET on quiet host (today's loaded runs failed); **mobile NOT MET** |
| R7 documentation true | PARTIAL |
| R8 secrets/guards | PARTIAL → guards now cover all dirs incl. `dist/`; remote secret unconfirmed |

**Estimate to a defensible real-world-ready bar (S1–S4): ~21–29 agent-sessions plus one Daniel
block (≈3–4 weeks at 1 session/day).** Full debt clearance (S5): ~37–54 sessions. The single
largest remaining blocker is not code volume: it is the Daniel-owned inputs (test user, Supabase
login for the name-only key check, Google OAuth, migrations/Auth URLs) that gate the ten live
flows.
