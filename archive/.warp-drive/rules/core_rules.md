# EasyTutor Engineering Rules

## Core Philosophy

- Reliability over cleverness
- Survival over abstraction
- Shipping over perfection
- Offline-first by default
- African network conditions are the baseline
- Every AI call must degrade gracefully
- Every feature must survive poor connectivity

---

## Architecture Rules

- No new abstraction unless duplicated 3 times
- Reuse existing patterns before creating new systems
- Read existing code before modifying architecture
- Never create parallel telemetry systems
- Never create duplicate queue systems
- Shared infrastructure is preferred

---

## AI Rules

- Every AI call must:
  - timeout
  - retry
  - fallback
  - log telemetry
  - render safe fallback UI

- No bare AI calls allowed
- No uncaught AI exceptions
- No null UI fallbacks

---

## Testing Rules

Every major feature requires:
- TypeScript clean
- QA runner green
- Failure-mode testing
- Offline simulation
- Low-network simulation

---

## Product Rules

- Students must never see blank states
- Vendors must never lose transactions
- Loading states must feel intentional
- Error messages must feel human
- Distribution matters more than architecture

---

## Execution Rules

- One sprint objective at a time
- No scope creep
- No dashboard work before telemetry exists
- No optimization before measurement
- No feature additions during hardening sprints
