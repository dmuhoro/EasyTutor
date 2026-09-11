# Spec 012: Local AI Bridge & Network Discovery

## Metadata
- **Status:** in-progress
- **Owner Agent:** builder
- **Risk Level:** medium
- **Architectural Impact:** high
- **Dependencies:** None
- **Last Updated:** 2026-05-10

---

## Goal
Enable physical mobile devices to discover and connect to a local Ollama instance running on the host developer machine, eliminating the `localhost` hardcoding.

## Design
- **Discovery:** Implement a strategy to find the host machine's IP (via manual config or network scan).
- **Bridge:** A central `Bridge` service that abstracts the base URL for AI and embedding requests.
- **Healthcheck:** Rapidly verify connectivity to the local AI before attempting a generation.

## Implementation Boundaries
- **Directory:** `lib/bridge/`
- **Files:** `discovery.ts`, `healthcheck.ts`, `routing.ts`, `localNetwork.ts`.
- **Constraint:** Must fallback to cloud AI or cached content if the local bridge is unreachable.

## Dependencies
- `lib/aiProvider.ts`
- `lib/ollama.ts`
- `lib/embeddings.ts`

## Verification Requirements
- [ ] Physical device can reach Ollama via the dynamically discovered IP.
- [ ] Healthcheck correctly identifies offline state within < 1s.
- [ ] Routing logic prefers Bridge over `localhost` if configured.

## Verification Checklist
- [ ] Implement `getHostIP` logic with environment variable override.
- [ ] Implement `BridgeHealth` check utility.
- [ ] Refactor `ollama.ts` and `embeddings.ts` to use `Bridge` URL.
- [ ] Add "Offline Mode" indicator logic for the UI.

## Audit Trail
- 2026-05-10 - Initial Spec Created.
