# Live DB drift record (2026-11-04)

Live project (ref iypolnvuwgdxzxviyxqr) holds 12 tables; repo holds 34.
Live tables (from live-db-audit-before.txt): ai_feedback, cached_responses, cached_roadmaps,
legacy_subjects, legacy_topics, profiles, quiz_sessions, subjects, topics, user_events,
user_feedback, user_progress.

Live-only functions: handle_new_user, rls_auto_enable (reference behaviour needed in baseline).

Manual changes made via the Supabase Assistant (post-audit, pre-hardening):
- search_path pinned to pg_catalog on both handle_new_user and rls_auto_enable.
- EXECUTE revoked from anon/authenticated on both functions.
- deny_api_roles SELECT policies added on ai_feedback, cached_responses, user_feedback.