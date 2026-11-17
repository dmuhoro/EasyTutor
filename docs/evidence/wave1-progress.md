# Wave 1 progress log (living document)

Branch: `fix/truth-pass` from `origin/main` @ `cae99d9`. Update after every task. No number is
recorded here unless a command in this session produced it.

## Session setup (2026-11-17)

- `git rev-parse HEAD origin/main` → both `cae99d9b8de0771f5862dd266cd66865f6d4739d`.
- `git status --short` → clean.
- `git checkout -b fix/truth-pass origin/main` → branch created, tracking `origin/main`.
- Tooling: node v22.22.1, npm 11.12.1, vitest 4.1.5, supabase CLI 3.0.0, Docker daemon up.
- `curl -s --max-time 3 http://localhost:11434/api/tags` → reachable (`gemma2:2b`). This is
  the cause of the local-vs-CI quiz-test discrepancy: local Ollama makes the vector path run;
  CI has no Ollama and takes the FTS path into an empty table.

## Baseline gates (this session, before any change)

| Gate | Command | Result |
|---|---|---|
| Tests | `npm test` | 64 files / 370 tests pass, 60.91s |
| Typecheck | `npm run typecheck` | 0 errors (masked: `@axe-core/playwright` is extraneous locally) |

## Task status

| Task | Status | Evidence | Notes |
|---|---|---|---|
| Layer 0 — spec + ADR-009 + progress log | IN PROGRESS | this file, `sprints/sprint_20_wave1_truth_pass.md`, `docs/adr/ADR-009-private-import-fts-retrieval.md` | ADR-009 resolves ADR-003/005 conflict |
| W1-0 Truth | NOT STARTED | — | |
| W1-1 CI green for real | NOT STARTED | — | fresh-clone reproduction running |
| W1-2 T2 at real boundary | NOT STARTED | — | blocked until ADR-009 committed |
| W1-3 Local Supabase proof | NOT STARTED | — | |
| W1-4 Close T3–T6 | NOT STARTED | — | |
| W1-5 Phase 1 DONE demo | NOT STARTED | — | |
| W1-6 Budgets that bite | NOT STARTED | — | |
| Final report / release | NOT STARTED | — | branch must remain unpushed |

## Layer commits

- *(pending)* `docs(sprint20): Wave 1 truth-pass spec, ADR-009, progress log`
