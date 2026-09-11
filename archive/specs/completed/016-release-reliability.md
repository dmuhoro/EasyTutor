# Spec 016: Release Reliability & Environment Guardrails

## Metadata
- **Status:** in-progress
- **Owner Agent:** release
- **Risk Level:** low
- **Architectural Impact:** low
- **Dependencies:** None
- **Last Updated:** 2026-05-10

---

## Goal
Implement a robust pre-launch diagnostic system that ensures the environment, configuration, and dependencies are correctly set before the app allows user interaction.

## Design
- **Diagnostics:** A `StartupDiagnostic` service that checks Supabase, Local AI, and Env variables.
- **Guardrails:** Block access to critical features if mandatory environment variables (e.g. API keys) are missing.

## Implementation Boundaries
- **Directory:** `scripts/release/`, `lib/diagnostics/`.
- **Constraint:** Diagnostics must run within < 500ms during app splash screen.

## Dependencies
- `lib/supabaseOps.ts`
- `lib/bridge/healthcheck.ts`

## Verification Requirements
- [ ] App displays a "Configuration Missing" warning if critical keys are absent.
- [ ] Release script validates `package.json` versioning before proceeding.

## Verification Checklist
- [ ] Implement `checkEnv` utility with Zod schema validation.
- [ ] Implement `StartupDiagnostics` hook for the root layout.
- [ ] Create `scripts/release/validate_bundle.js`.
- [ ] Update `release/RELEASE_PROCESS.md`.

## Audit Trail
- 2026-05-10 - Initial Spec Created.
