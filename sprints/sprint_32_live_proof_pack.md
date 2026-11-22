# Sprint 32 — One-session live-proof pack (G-10…G-14)

Branch: `feat/live-proof-pack` (planned, stacks after Sprint 31).
Date: 2026-11-22. Spec before code.

## Directive

Convert the external blockers into a single, short, scheduled Daniel session so the
10-flow live-proof checklist (`scripts/live-proof-checklist.md`) can be ticked with screenshots.

## Deliverable

A runbook at `docs/evidence/live-proof-pack.md` containing:

1. Exact inputs needed, with where to place them — credentials go in a mode-600 temp file under
   `/tmp/opencode`, never in chat, a commit, an evidence file or a test fixture.
2. The three blocking steps: valid remote test login, `GROQ_API_KEY` in Supabase Edge Function
   secrets (verify only the `Deno.env.get("GROQ_API_KEY")` lookup name at
   `supabase/functions/ai-proxy/index.ts:41`, never the value), Vercel browser access.
3. The exact commands to run once inputs exist, in order, with expected output and screenshots.
4. An explicit "not claimed yet" section listing R1 flows still unverified.

## Acceptance criteria

- No secret value appears anywhere in the repo, chat, evidence or commit message.
- Runbook is executable by Daniel without further discovery.
- STATUS and tracker updated to reflect pack delivered but live proof still BLOCKED.
