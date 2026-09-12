# Live Proof Checklist — Layer 1 (2026-09-12 network proof)

Purpose: prove every live path below works on the **real network**, running
against the real Supabase project and a real device/emulator + Ollama on the
same WiFi. Tick each box only when the step genuinely succeeds. Any unchecked
step at the end is a **release blocker** — do not ship with gaps. "Fail-closed"
means: when the expected behaviour cannot happen, the app shows an explicit,
non-silent error (never a fake success, never an empty screen claiming done).

Environment to run before starting:

- Device/emulator running `npx expo start` (LAN mode), installed via
  `npx expo run:android` or Expo Go.
- Ollama running locally: `ollama serve`; base url set in Settings using the
  computer's LAN IP, **no `/v1` suffix**.
- Deepseek pull (reasoning slot): `ollama pull deepseek-r1:14b`
- Embedding pull (polymath RAG): `ollama pull nomic-embed-text`
- Supabase live project already migrated with `supabase/migrations/run-all.sql`
  (paste into SQL editor) or an equivalent live schema.

---

## Flow 1 — Supabase authentication

- [ ] Sign up with a fresh email → confirmation email arrives.
  - **Expected:** account is created; portal_type resolves via `portalFromMode`.
  - **Command or action:** App → Sign Up → submit → open confirmation link.
  - **Fail-closed:** duplicate/invalid email shows an explicit error string on the form.
- [ ] Sign in with that account on the same device.
  - **Expected:** session persisted; reload keeps you signed in (AsyncStorage).
  - **Command or action:** Sign in → kill app → reopen.
  - **Fail-closed:** invalid credentials return the server's error message.

## Flow 2 — Preset curriculum roadmap (hosted, high_school)

- [ ] Pick a curriculum subject/topic → Generate.
  - **Expected:** 7-day roadmap renders from real provider (hosted/local chain).
  - **Command or action:** Explore → preset topic → Generate roadmap.
  - **Fail-closed:** generation errors surface in the UI; retry is offered; no silent placeholder mislabelled as real.

## Flow 3 — Free-form polymath roadmap (knowledge_explorer)

- [ ] Portal switched to Knowledge Explorer → type any topic → Generate.
  - **Expected:** roadmap generates for a topic NOT in any curriculum; saved as a
    learning_goal row.
  - **Command or action:** Settings → Portal: Knowledge Explorer → Home → "Learn anything" → topic → Generate.
  - **Fail-closed:** non-`knowledge_explorer` saves are rejected by
    `learningOrchestrator.saveLearningGoal` with an explicit `[GOVERNANCE ERROR]`;
    the UI shows the rejection.

## Flow 4 — Quiz session

- [ ] Complete a quiz in a generated roadmap.
  - **Expected:** score/total recorded to `quiz_sessions` (governed write, portal stamped).
  - **Command or action:** Roadmap → open quiz → answer all → submit.
  - **Fail-closed:** offline quiz serves cached questions with an explicit
    "offline practice" label, and progress is queued (never silently dropped).

## Flow 5 — Progress persistence + sync (idempotent/local-first)

- [ ] Tick tasks, leave the roadmap, reopen outside the app, come back.
  - **Expected:** checked tasks restored locally and matching `cached_roadmaps.checked_tasks`.
  - **Command or action:** toggle several tasks → kill app → reopen roadmap.
  - **Fail-closed:** sync collision keeps the local authoritative copy and logs a
    WARN; no duplicate or lost toggle.

## Flow 6 — Learning goal journal

- [ ] Create and later list a free-form learning goal.
  - **Expected:** `learning_goals` upsert on (user_id, topic); listed on the
    Knowledge Explorer / roadmap list merged by topic.
  - **Command or action:** generate a free-form roadmap (creates goal) → return to list.
  - **Fail-closed:** DB failure returns a clear error; the local goal snapshot is
    never overwritten with an empty result.

## Flow 7 — Real document ingestion + RAG retrieval

- [ ] Paste a text document in Polymath mode → ingest.
  - **Expected:** `documents` row + `document_chunks` rows (deterministic ids);
    `match_document_chunks` returns top chunks for a related query.
  - **Command or action:** Knowledge Explorer → Add document → paste text → Save;
    then ask the tutor a question about it (Layer 2 wiring).
  - **Fail-closed:** embedding failure counts the chunk as failed (`{stored, failed, total}`);
    UI reports the failed count — no partial claim of full ingestion.

## Flow 8 — Ollama connectivity (/api/tags model slots)

- [ ] Settings shows the four model slots with live status badges.
  - **Expected:** AVAILABLE for pulled models, NOT PULLED for missing ones,
    UNKNOWN only when the server is unreachable.
  - **Command or action:** Settings → Model Slots → note AVAILLABLE/NOT PULLED/UNKNOWN;
    `curl http://<LAN-IP>:11434/api/tags` from the computer.
  - **Fail-closed:** unreachable host = UNKNOWN, never AVAILABLE; endpoint used is
    `/api/tags` (no `/v1`).

## Flow 9 — Ollama inference (reasoning role)

- [ ] Local AI is ON; ask the tutor a reasoning question.
  - **Expected:** answer returned from `deepseek-r1:14b` via `/api/chat`; model
    metered as reasoning in ai_call_logs.
  - **Command or action:** Settings → Use Local AI ON → Tutor → question.
  - **Fail-closed:** if `deepseek-r1:14b` is not pulled, the app returns an explicit
    error naming the model + `ollama pull deepseek-r1:14b`; it does NOT silently
    swap to another model or pretend success.

## Flow 10 — Offline fallback

- [ ] Disable WiFi/Ollama → generate a roadmap and take a quiz.
  - **Expected:** roadmap serves cached/placeholder route reported honestly;
    quiz serves cached questions labelled offline; progress operations queue locally.
  - **Command or action:** airplane mode → Generate roadmap → take quiz.
  - **Fail-closed:** provider field reports `placeholder`/`cache` (never a real
    provider); user sees "offline" copy; nothing is silently discarded.