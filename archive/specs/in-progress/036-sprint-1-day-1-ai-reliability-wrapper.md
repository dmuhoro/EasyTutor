# 036 — Sprint 1 Day 1 — AI Reliability Wrapper and Dependability hardener

## Metadata
- **Status:** in-progress
- **Owner Agent:** builder
- **Risk Level:** medium
- **Architectural Impact:** high
- **Dependencies:** 011-system-observability.md, 016-release-reliability.md
- **Last Updated:** 2026-05-24

---

## Goal
Implement a universal, robust AI reliability wrapper to ensure maximum uptime, graceful degradation, cost transparency, and seamless UX during flaky internet and AI API disruptions.

## Design
- Create a universal AI reliability wrapper at `lib/ai/reliability.ts` that implements:
  - Exponential backoff with jitter retry strategy.
  - Multi-provider fallback chain (Claude -> Groq -> Local Ollama -> Cache -> Placeholder).
  - Timeout protection.
  - Zod-based JSON schema validation.
  - Latency, token usage, and cost tracking metric logging.
- Create an `AIFeedback` UI component at `components/ui/AIFeedback.tsx` to handle loading messages, error modes, and retry controls.
- Refactor existing AI entrypoints (`lib/ai.ts` and `lib/api.ts`) to route all generations through the reliability wrapper.
- Add robust tests at `tests/reliability/aiReliability.test.ts`.

## Implementation Boundaries
- Focus strictly on the AI wrapper, telemetry logging, loading/error component, and refactoring the AI callers.
- Do not make changes to database schema, pgvector searches, or portal routes.

## Dependencies
- [x] Vitest framework & Mock Supabase environment
- [x] Zod schemas in `lib/schemas.ts`

## Verification Requirements
- [ ] `npm run typecheck`
- [ ] `node scripts/architecture/validate_boundaries.js`
- [ ] `npm test tests/reliability/aiReliability.test.ts`
- [ ] `node scripts/qa/qa_runner.js`

## Verification Checklist
- [ ] Exponential backoff with jitter retry strategy executes correctly on network failures.
- [ ] Timeout aborts slow cloud requests and successfully transitions to local Ollama.
- [ ] Fallback chain recovers from Claude/Groq downtime using cached or offline modes.
- [ ] Zod schema validation catches corrupt/invalid JSON outputs and triggers a retry/fallback.
- [ ] Token and cost tracking logs estimated USD cost and latency metrics for hosted models.
- [ ] Refactored explanation generation, roadmap generation, and quiz generation execute properly.
- [ ] AIFeedback component renders localized African EdTech states and handles manual retries.

## Audit Trail
- 2026-05-24: Spec created and accepted as implementation contract for Sprint 1 Day 1.
