# ai-context/ — the AI-operable continuity layer for EasyTutor

This folder is the **single entry point any agent reads first** — whether that agent is
Codex, Cursor, Antigravity, Google Gemini CLI, or Google AI Studio. The point is
**tool-agnostic context**: you should be able to lose one coding tool and pick up with
another in under 5 minutes with full working memory of the project.

Everything here is **git-verified ground truth** — no memory, no fabricated hashes.

---

## READ FIRST, in this order (one bootstrap prompt)

Paste this ONE prompt at the start of any agent session (Gemini CLI, AI Studio, Codex, Cursor, Antigravity):

```
You are onboarding into EasyTutor (offline-first KCSE tutor; first wedge of a Learning OS
for Africa). Start by reading, IN ORDER: ai-context/README.md (this file), STATUS.md,
then sprints/sprint_9_branch_convergence_and_green_gate.md. Then and only then audit the
repo roots with git (git rev-parse HEAD, git status --porcelain, git log --oneline -10)
to confirm the docs are true against disk. Never trust memory — git is the source of
truth. Then report the current verified state and the highest-leverage next objective
before doing any work. Follow AGENTS.md rules (boundaries, governed writes, gates) for
anything you actually change.
```

## What IS in this folder (planned — build incrementally, one file per concern)

| File | Purpose | Status |
|---|---|---|
| `README.md` | Flagship bootstrap + index (this file) | ✅ present |
| `project-state.md` | ONE self-contained snapshot: mission → arch → HEAD → gates → blocked → next | 🟦 next |
| `architecture.md` | The governed boundaries + engine inventory (mirrors `docs/architecture/`) | planned |
| `tech-stack.md` | Declared version, tooling, gates, key scripts | planned |
| `current-state.md` | Live git reality (HEAD, divergence, clean tree) | planned |
| `roadmap.md` | The 4-move moat plan + product GC | planned |
| `progress-tracker.md` | Sprint index, evidence index, cross-links | planned |
| `workflow-rules.md` | The constitution's enforceable rules for agents | planned |
| `ui-context.md` | Design-system tokens + screens (mirrors `docs/ui/`) | planned |
| `db-contracts.md` | Portaled, governed schema contracts (mirrors docs) | planned |

## Hard rules for agents touching this repo (constitution, enforced, not aspirational)

1. **Git is truth.** Cite `git rev-parse --short HEAD`, never memory. Re-verify `0 ahead / 0 behind`, clean tree, before claiming green.
2. **Fail closed, never fail open.** No silent drops, no unlimited-loss defaults, no fabricated success. If a gate isn't run, it isn't green.
3. **Enforce at the real boundary, not in a helper.** Governed writes only via `src/infrastructure/database/` (portaled: `high_school`/`university`/`knowledge_explorer`). Never raw `supabase.from()` from UI, never a magic string.
4. **AI calls** go through `lib/ai/reliability.ts` (timeout, retry, fallback, explicit source).
5. **No version bump without a real code/behavior delta.** Current: `1.0.0` — held, because this session's delta is docs/evidence only (0 product-code files changed, git-verified).
6. **Every completion ends with evidence** under `docs/evidence/<date>-*`, updated `STATUS.md`/`CHANGELOG.md`, and the six-gate re-run.

## The six gates (the ONLY thing that makes a claim "green")

| Gate | Command |
|---|---|
| Typecheck | `npx tsc --noEmit` |
| Tests | `npm test` |
| Boundaries | `node scripts/architecture/validate_boundaries.js` |
| QA runner | `node scripts/qa/qa_runner.js` |
| Web export (the Vercel gate) | `npx expo export --platform web` |
| Lint | `npm run lint` |

Last verified full-green run on the pushed tree: **41 files / 181 tests passed**, tsc 0,
lint 0 errors, boundaries AUDIT PASSED, QA SUCCESS, web export GREEN — at HEAD
`release/v1.0.0` (`e7f8254`), all four branches 0/0 vs origin, clean tree.

---

## Why this folder exists (honest framing)

The project lost hours to context-resurrection: every new agent re-read `git log`, re-derived
which files had moved, re-proved boundaries, re-ran gates. This folder makes **context
portable**: next session (or next tool, or AI Studio on a fresh machine) starts with working
memory instead of archaeology. It's the difference between "an agent doing a task" and
"an operating system of agents that all converge on the same truth."
