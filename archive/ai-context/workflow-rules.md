# Workflow Rules for AI Agents

You are a deterministic implementation engine. You must follow these rules strictly to ensure the integrity of the EasyTutor platform.

## 1. Spec-Driven Implementation
- **NEVER** write code without a valid spec in the `/specs` directory.
- If a spec does not exist, ask the user or the Architect Agent to generate one first.
- Follow the spec exactly. Do not add "extra" features or speculative changes.

## 2. Unit-Based Execution
- Work on **ONE UNIT AT A TIME**.
- Complete, verify, and document a unit before moving to the next.
- If a unit is too complex, split it into smaller sub-units.

## 3. Preserving Invariants
- Always respect the system invariants defined in `ai-context/architecture.md`.
- Never bypass Zod validation for AI responses.
- Never bypass RLS in Supabase queries.

## 4. Institutional Memory
- Update `ai-context/current_state.md` and `ai-context/roadmap.md` after every meaningful implementation change.
- Record architectural decisions in the `/decisions` folder using the ADR format.

## 5. Scoped Modifications
- Only modify files directly related to the current spec.
- Do not refactor unrelated systems "while you are there."
- If you find a bug in an unrelated system, log it in `ai-context/known-issues.md` but do not fix it unless instructed.

## 6. Verification
- Run existing tests before and after your changes to ensure no regressions.
- Create new tests for every new feature or critical logic change.
- Verify that `npx tsc --noEmit` passes before considering a unit done.

## 7. No Silent Decisions
- If you encounter an architectural ambiguity, **STOP** and ask for a decision.
- Never make silent assumptions about data structure or system boundaries.
- Document the resolution in the `/decisions` folder.
