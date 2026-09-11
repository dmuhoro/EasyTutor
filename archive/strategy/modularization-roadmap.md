# AI Engineering OS: Modularization Roadmap

## Objective
Decouple the core AI Engine from the EasyTutor product layer to enable reusability across future educational and engineering products.

## Layer Separation Map

### 1. Product Layer (EasyTutor Specific)
- `app/`: Routing, UI views.
- `components/`: Specific academic UI.
- `ai-context/`: Product-specific contracts and rules.

### 2. Engine Layer (Domain Agnostic)
- `lib/ai/`: Orchestration, prompt templating.
- `lib/retrieval/`: Vector search, ranking.
- `lib/ingestion/`: Batching, chunking.
- `lib/cache/`: Advanced TTL/Semantic caching.
- `lib/intelligence/`: Mastery and adaptive learning algorithms.

### 3. Infrastructure Layer (System Level)
- `lib/bridge/`: Local network discovery.
- `lib/diagnostics/`: Startup safety checks.
- `observability/`: Telemetry, metrics, tracing.
- `scripts/qa/`: Automation runners.

## Extraction Phases

### Phase 1: Virtual Modularization (Sprint 2)
- [x] Strict boundary enforcement.
- [x] Move services into domain-specific subfolders (e.g. `lib/cache`, `lib/bridge`).
- [ ] Dependency analysis reporting.

### Phase 2: Package Extraction (Future)
- Extract Engine and Infrastructure into internal npm packages (`@ai-os/engine`, `@ai-os/infra`).
- EasyTutor becomes a consumer of these packages.

### Phase 3: Multi-Product Pilot
- Spin up "EasyCode" (AI tutor for developers) using the same core engine.
