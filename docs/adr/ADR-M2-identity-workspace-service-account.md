# ADR M2: Identity — EasyTutor as a StashMind workspace with service account

## Problem
EasyTutor learners must not log in twice, and the StashMind service key must never reach the mobile app.

## Decision
EasyTutor is a workspace in StashMind with a service account held only on EasyTutor's server. A `(workspace_id, external_user_id) → stashmind_user_id` mapping lives in StashMind; EasyTutor's Supabase `stashmind_links` table (RLS) mirrors it. EasyTutor's server calls StashMind on behalf of each learner; the mobile app talks only to EasyTutor's server. See StashMind `docs/adr/ADR-M2-identity-workspace-service-account.md`.

## Reasoning
Single login for learners; server-side secret boundary; no StashMind key in the mobile bundle.

## Consequences
EasyTutor server is a trusted intermediary; service-account key rotation and H3 staging-key review required before live verification.

## Cross-reference
StashMind `docs/adr/ADR-M2-identity-workspace-service-account.md`
