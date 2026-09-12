# AI-OS: Engineering Guardrails & Checklists

## 1. Implementation Checklist (Mandatory for every PR)
- [ ] **Boundary Check**: Does this code stay within its domain (`/portals`, `/intelligence`, etc.)?
- [ ] **Governance Check**: Are all DB writes using `Database.governedWrite`?
- [ ] **Isolation Check**: Does the logic respect the `portal_type` of the current context?
- [ ] **Observability Check**: Are critical events emitting telemetry via `Telemetry.emit`?
- [ ] **Type Check**: Does it use the `src/types/canonical.ts` interfaces?
- [ ] **Magic Value Check**: Are all constants in `src/config/registry.ts`?

## 2. Content Ingestion Checklist
- [ ] **Hierarchy Validation**: Does the content follow the `Subject -> Topic -> Subtopic` spine?
- [ ] **ID Canonicalization**: Are all IDs prefixed correctly (`HS-`, `UNI-`, `KE-`)?
- [ ] **Metadata Audit**: Are all retrieval chunks tagged with `portal_type` and `curriculum_scope`?

## 3. Architecture Enforcement Rules
1. **No UI-Direct DB Calls**: All DB interactions must go through the `/infrastructure` layer.
2. **Strict Dependency Flow**: Portals -> Intelligence -> Knowledge -> Infrastructure -> Core.
3. **No Domain Leakage**: University logic must never import High School specific utilities.
