# Playbook: Operational Procedures

## Feature Implementation
1. **Spec Creation:** Define the goal, design, implementation, and verification in `/specs`.
2. **Architecture Check:** Ensure the plan respects the invariants in `ai-context/architecture.md`.
3. **Execution:** Implement one unit at a time.
4. **Validation:** Run `npx tsc --noEmit` and relevant vitest suites.
5. **Memory Update:** Document the new state in `ai-context/current_state.md`.

## Audits
1. **Static Analysis:** Run ESLint and TypeScript checks.
2. **Performance Check:** Measure AI generation latency and DB query performance.
3. **RAG Review:** Evaluate chunking quality and semantic relevance of retrieved segments.
4. **Security Review:** Verify RLS policies and user data isolation.

## Bug Fixing
1. **Reproduction:** Create a failing test case in `tests/`.
2. **Root Cause Analysis:** Trace the issue using logs with bracketed tags.
3. **Fix & Verify:** Implement the fix and ensure the test case passes.
4. **Regression Check:** Run the full test suite.

## Release Hardening
1. **Error Boundaries:** Verify global and component-level catch blocks.
2. **Offline Mode:** Test app behavior with network disabled (Local Ollama fallback).
3. **Stress Test:** Rapidly trigger AI requests to verify deduplication and timeout safety.
4. **Production Build:** Generate a release bundle using `npx expo export`.

## Semantic Retrieval Optimization
1. **Chunking Tuning:** Adjust chunk size and overlap based on document type.
2. **Embedding Quality:** Verify embedding dimension (384) and model consistency.
3. **RPC Match Review:** Analyze the top-k results for relevance to sample queries.
