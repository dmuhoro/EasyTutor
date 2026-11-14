# Sprint 13 — Automotive Science Principles study loop + production cloud gate + PWA

Date: 2026-11-14.

Goal: make EasyTutor usable for real daily study, starting with Automotive Science Principles exam prep; close the production cloud outage that blocked the live site; ship an installable PWA.

Layers:
1. Baseline gate: typecheck 0, lint 0 errors, 261/261 tests, boundary audit 0 violations, QA runner SUCCESS, web export PASS.
2. Knowledge ingestion (lib/knowledge.ts): storeChunks now stamps taxonomy_scope/curriculum_scope/school_scope/vector_namespace so ingested chunks are retrievable by subject through match_document_chunks (governed layer, portal_type/user_id stamped). Deterministic chunk ids make re-ingestion an idempotent upsert — no duplicates, data survives reload.
3. Self-directed ingest UI (screens/self_directed/index.tsx): names subject "Automotive Science Principles" (sd-automotive, GLOBAL_OPEN) and passes scope fields to storeChunks.
4. Grounded quiz + honesty guard (screens/tabs/quiz.tsx, src/intelligence/pipelines/pipelineExecutor.ts): quiz_question_generation returns notCovered when retrieval is empty; code-level override forces honesty when chunks.length === 0 so quizzes are never fabricated from model knowledge. Quiz renders a "not covered in your notes" state instead of guessing.
5. Wrong-answer tracking + weak points into mastery_state (existing), quiz wrong-answers test updated to set match_document_chunks RPC result so the grounded path is exercised.
6. New tests: tests/flows/automotive.flow.test.ts (ingestion stores scoped chunks; grounded quiz question; not-covered path; re-ingestion idempotency + no duplicates; user_id RLS isolation key stamped). Full suite 261/261.
7. Production cloud gate (P0): Vercel build had no EXPO_PUBLIC_* env vars → "[INFRASTRUCTURE ERROR] Supabase client unavailable" killed auth/cloud sync/feedback/AI/quiz on the live site. Configured EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_GROQ_API_KEY on Vercel Production and redeployed easytutor-ten.vercel.app. scripts/check_build_env.mjs is now Vercel-aware (verifies Supabase URL/anon key + Groq key at build time) so a missing deployed env fails closed instead of shipping a dead cloud layer.
8. Feedback boundary violation (P0, Constitution Article III): components/FeedbackModal.tsx, app/_layout.tsx (profile sync), app/onboarding.tsx (profile upsert) wrote via raw getSupabaseClient(). All routed through Database.governedWrite stamped with portal_type/user_id. Added supabase/migrations/20261114_feedback_governed_write.sql (additive portal_type on ai_feedback/user_feedback). Extended validate_boundaries.js to flag raw getSupabaseClient() bypasses (allowing only the auth onAuthStateChange subscription).
9. PWA (TASK 3): public/manifest.json (name/short_name/start_url/display:standalone + 192x192 & 512x512 maskable icons), public/service-worker.js (shell precache + network-first cache fallback), public/icons/ (resized from assets/icon.png), scripts/pwa-assets.mjs post-build step (copies public/ to dist/, injects manifest link + SW registration into dist/index.html), package.json build script updated. Live site installable via "Add to Home Screen".

Evidence: docs/evidence/2026-11-14-automotive-study-loop.md.
Gates: typecheck 0, lint 0 errors, full suite 261/261 pass, boundary 0 violations, QA SUCCESS, web export PASS.

Risks for next session:
- Full interactive sign-in→ingest→teach→quiz→review loop on the live URL cannot be completed without a confirmed Supabase user (email confirmation enforced); all three env vars are configured, but a confirmed account is needed for live end-to-end proof.
- EXPO_PUBLIC_GROQ_API_KEY is client-bundled (Expo requirement); confirm this is acceptable or move cloud AI to the server-side proxy.
