# Pilot observer sheet — 10-minute learner journey

**Spec:** `sprints/sprint_86_pilot_ready.md` WS6
**Proof target:** R1 — `scripts/live-proof-checklist.md` 10/10 ticked with
screenshots stored outside the repository.

Daniel runs each session and writes `docs/evidence/R1-session-NN.md` with
**initials only**. The agent counts and summarises; it never ticks a box it did
not observe and never writes a session note for a learner.

## Setup before the timer starts

- Real network, real Supabase staging project, real hosted `ai-proxy`.
- Web/PWA on 390 px viewport or the attached Android device.
- A dedicated pilot account auto-confirmed by Daniel.
- Screenshot destination outside the repo named in the session note (path only).

## Minute-by-minute script

| Min | Action | Checklist flow | Observe and record |
|---:|---|---|---|
| 0–1 | Sign up or sign in; confirm session survives reload | 1 | Error strings on duplicate/invalid email; portal resolves via `portalFromMode`; kill/reopen keeps session |
| 1–2 | Choose subject → generate 7-day roadmap | 2 | Real provider label, not placeholder; error surfaces with Retry |
| 2–3 | Switch to Knowledge Explorer → free-form topic → generate | 3 | Goal saved under `knowledge_explorer`; a non-explorer save is refused with `[GOVERNANCE ERROR]` shown |
| 3–4 | Open quiz → answer all → submit | 4 | Score/total written to `quiz_sessions`; offline path labelled honestly |
| 4–5 | Tick tasks → leave → reopen | 5 | Checked tasks restored locally and in `cached_roadmaps.checked_tasks`; no duplicate/lost toggle |
| 5–6 | Return to goal list | 6 | Goal upserted on `(user_id, topic)` and merged by topic; DB failure never blanks the local snapshot |
| 6–7 | Paste a text document → ingest → ask a cited question | 7 | `documents` + `document_chunks` rows; retrieved chunks with valid citations; failed chunks reported by count |
| 7–8 | Settings → model slots | 8 | AVAILABLE / NOT PULLED / UNKNOWN correct; unreachable host is UNKNOWN, never AVAILABLE |
| 8–9 | Ask a reasoning question through the active rail | 9 | Answer source label truthful; no silent rail swap; explicit model error when absent |
| 9–10 | Airplane mode → roadmap + quiz → reconnect | 10 | `placeholder`/`cache` source, offline copy, queued progress, recovery with no silent drop |

## Friction notes (per session)

- **Time to first answer:** ____ s · **Quiz completion:** ____ s · **Sync after reconnect:** ____ s
- **Friction points (plain words):** __________________________________________
- **Fail-closed behaviour observed:** ________________________________________
- **P0/P1 defects:** __________________________________________________________
- **Screenshots:** folder path only, outside repo, no personal data __________

## Counting rule

A flow counts as ticked only when the observer records the expected behaviour
**and** a screenshot reference. Ten flows ticked across the cohort closes R1;
a skipped flow stays unchecked and is a release blocker. Provider quotas at
scale, other devices and iOS are **not claimed** by these sessions.
