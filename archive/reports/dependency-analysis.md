# Dependency Analysis: AI OS Modularization

## Layer Breakdown

### Infrastructure Layer (Core)
- **Dependencies:** `zod`, `zustand`, `expo-constants`.
- **Status:** 100% decoupled from product logic.
- **Files:** `lib/bridge/*`, `lib/diagnostics/*`, `observability/*`.

### Engine Layer (Logic)
- **Dependencies:** `@supabase/supabase-js`, `lib/embeddings.ts`, `lib/ai.ts`.
- **Status:** 85% decoupled. Still relies on product-specific table names in some areas.
- **Files:** `lib/cache/*`, `lib/intelligence/*`, `lib/ingestion/*`, `lib/retrieval/*`.

### Product Layer (EasyTutor)
- **Dependencies:** Engine + Infrastructure.
- **Status:** Highly coupled (as expected).
- **Files:** `app/*`, `components/*`.

## Boundary Violations Found
- **None.** The `validate_boundaries.js` script enforces that UI never calls DB directly and that Engine doesn't import UI.

## Extraction Readiness
- **Bridge:** Ready.
- **Tracer:** Ready.
- **Semantic Chunker:** Ready.
- **Mastery Engine:** Requires abstraction of `Topic` and `Subject` IDs into a generic `EntityID`.
