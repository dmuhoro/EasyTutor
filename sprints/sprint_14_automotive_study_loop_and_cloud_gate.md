# Sprint 14 — Automotive study loop + production cloud gate + PWA + governed AI

Date: 2026-11-14.

Goal: make EasyTutor usable for real daily study, starting with Automotive Science Principles exam prep; close the production cloud outage and Groq key leak that blocked the live site; ship an installable PWA; add governed knowledge ingestion with citations/chapter scoping.

Layers:
1. Baseline gate: typecheck 0, lint 0 errors, 263/263 tests, boundary audit 0 violations, QA runner SUCCESS, web export PASS, public-env guard PASS (only EXPO_PUBLIC_SUPABASE_URL / ANON_KEY).
2. Knowledge ingestion (lib/knowledge.ts): storeChunks accepts ChunkInput[] with deterministic chunk ids + per-chunk metadata; stamps scope columns; deterministic chunk ids make re-ingestion an idempotent upsert — no duplicates, data survives reload.
3. Self-directed ingest UI (screens/self_directed/index.tsx): names subject "Automotive Science Principles" (sd-automotive); new "Import Study Pack (JSONL)" web file picker parses corpus.jsonl (id, subject, source, chapter_no, chapter_title, page, chunk_index, text) in-browser and batch-stores 50 chunks at a time with a progress bar via storeChunks/governed layer into the signed-in user's PRIVATE scope (curriculumScope undefined — book text never GLOBAL_OPEN).
4. Grounded quiz + not-covered honesty guard (screens/tabs/quiz.tsx, pipelineExecutor.ts): quiz reports a gap instead of guessing when notes don't cover a topic.
5. Citations + chapter scoping (lib/retrieval.ts, screens/tabs/study.tsx): buildCitation() → [Source ChN p.P] (e.g. [Bird Ch15 p.171]); getAvailableChapters(); chapter picker scopes retrieval; ragContext appends citations; sysPrompt instructs the model to cite sources.
6. Production cloud gate (P0): Vercel build had no EXPO_PUBLIC_* env vars → "[INFRASTRUCTURE ERROR] Supabase client unavailable" killed the live site. Configured EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY on Vercel Production and redeployed easytutor-ten.vercel.app.
7. Groq key leak (P0-A): removed callGroq()/checkGroqAvailable() and every EXPO_PUBLIC_GROQ_API_KEY read from client code. Groq is reached only through the server-side ai-proxy Supabase function.
8. Hardened ai-proxy (supabase/functions/ai-proxy/index.ts): requires valid Supabase user JWT (rejects anonymous), per-user daily rate limit (DAILY_LIMIT=200 via ai_call_logs), allowlists providers AND models, caps max_tokens at 1000, hardcoded Groq endpoint only (never forwards arbitrary URLs), generic errors (never echoes keys or raw upstream errors). Server-only env vars: GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.
9. Feedback boundary violation (P0): FeedbackModal, app/_layout.tsx, app/onboarding.tsx routed through Database.governedWrite (portal_type/user_id stamped) instead of raw getSupabaseClient(); validate_boundaries.js extended to catch raw client bypasses.
10. PWA (P0-B): manifest + service worker + icons + post-build inject; verified live (manifest 200, SW 200, manifest link, icons 200, no bundle key leak).
11. Deploy (P0-C): preview + production deployed via Vercel CLI (`vercel --prod`); preview verification blocked by vercel_authentication (infra setting); production verified publicly.
12. Deferred: CAT mode (P2) — mathjs could not be installed cleanly; lowest priority.

Evidence: docs/evidence/2026-11-14-automotive-study-loop.md.
Gates: typecheck 0, lint 0 errors, full suite 263/263 (sequential), boundary 0 violations, QA SUCCESS, web export PASS, public-env guard PASS.

Risks for next session:
- Full interactive sign-in→ingest→teach→quiz→review loop on the live URL needs a confirmed Supabase user (email confirmation enforced); all env vars are configured.
- CAT mode (P2) blocked on a clean mathjs install.
