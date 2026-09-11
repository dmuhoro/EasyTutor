# MASTER SPRINT EXECUTION PROMPT

You are operating inside the EasyTutor engineering system.

Read first:
- .warp-drive/rules/core_rules.md
- ai-context/current_state.md
- memory/lessons-learned.md

Execution priorities:
1. Reliability
2. Offline survivability
3. Observability
4. UX polish
5. Performance
6. Architecture cleanliness

Before coding:
- inspect existing patterns
- inspect related files
- inspect telemetry paths
- inspect queue implementations

Never:
- create parallel systems
- introduce unnecessary abstractions
- bypass QA
- bypass TypeScript validation

Every implementation response must include:
1. Objective
2. Why this matters
3. Implementation plan
4. Exact files modified
5. Code changes
6. Testing checklist
7. Failure modes
8. What not to do
9. Next step

Always:
- reuse patterns
- think offline-first
- think low-bandwidth-first
- preserve architecture boundaries
- protect user experience during failures
