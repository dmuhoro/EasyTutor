# CLAUDE.md — Agent Operating Guide (EasyTutor)

This file exists so any coding agent (Claude Code, opencode, or another tool)
operates the same way. It is scoped to this repository; the swarm tooling it
previously described (`claude-flow`, `.claude/*`) is retired to `archive/`.

## Always enforced
- Follow `CONSTITUTION.md` (execution safety) and `AGENTS.md` (process).
- Read `STATUS.md` before assuming anything is live/stubbed/blocked.
- Read the relevant ADR in `docs/adr/` before working in an ADR-covered area
  (database governance ADR-006, orchestration ADR-007, AI routing ADR-002).
- Do what has been asked; nothing more, nothing less.
- Prefer editing existing files; never create files unless necessary for the goal.
- Never commit secrets, credentials, `.env` files, `*.pem`, or `*.key`.
- Keep files focused; prefer small modules over one giant file.
- TypeScript strict; the typechecker is authoritative.

## Repo layout (current, verified)
- `app/`, `components/`, `hooks/`, `store/`, `data/` — the Expo app surface.
- `lib/` — engines, AI reliability wrapper, gateway client.
- `src/infrastructure/database/` — the ONLY governed DB layer
  (`buildPortalScopedQuery` / `executeGovernedWrite`); no UI direct Supabase calls.
- `src/intelligence/` — orchestration authority (ADR-007).
- `src/config/registry/`, `src/types/canonical/`, `src/knowledge/` — registry, types,
  and taxonomy load-bearing modules.
- `archive/` — dead code, kept for history, excluded from builds/tests/tsc.
- `docs/adr/` — ADRs · `docs/sprints/` — sprint history · `docs/evidence/` — proof ·
  `sprints/` — active sprint records · `CHANGELOG.md` — release log.

## Build & Test (green gates)
```bash
npm run typecheck     # tsc --noEmit — must be 0 errors
npm run lint
npm test              # vitest
npm run build         # npx expo export --platform web (Vercel gate)
node scripts/architecture/validate_boundaries.js
node scripts/qa/qa_runner.js
```
- ALWAYS run typecheck + tests after code changes.
- ALWAYS verify the web export builds before committing.

## Security rules
- Never hardcode API keys, secrets, or credentials in source.
- Never commit `.env*`, `*.pem`, `*.key`, or service-role material.
- Validate input at system boundaries; sanitize paths.