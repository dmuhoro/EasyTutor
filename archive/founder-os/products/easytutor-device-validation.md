# EasyTutor Device + Network Validation Notes

Date: 2026-05-27
Scope: Sprint 1 finalization operational notes

## Airplane Mode Behavior
- Core app navigation remains available in offline mode.
- AI literacy content is available offline after first successful sync/load from Supabase because content is cached in AsyncStorage.
- Analytics writes do not block UI; failed sends are queued to `analytics_queue`.

## Reconnect Replay Behavior
- On app foreground (`AppState=active`), `flushAnalyticsQueue()` runs fire-and-forget.
- Queue replay removes successful events and preserves failed events.
- Replay uses `event_id` identity, making retries duplicate-safe when combined with DB uniqueness (`user_id,event_id`).

## Queue Replay Timing
- Replay trigger: foreground transition.
- Replay flow is serialized during flush (`isFlushingQueue`) to avoid concurrent flush races.
- Enqueue path is serialized (`enqueueChain`) to prevent race-based queue corruption under burst traffic.

## AI Fallback Latency Observations
- Reliability wrapper still follows Claude -> Groq -> Ollama -> cache -> placeholder cascade.
- Latency and cost are recorded in `ai_call_logs` and exposed through daily operational reporting.

## Cold Start Timing Notes
- App boot still initializes knowledge and retry sync jobs before full readiness.
- Operationally, analytics queue replay does not block splash-to-ready transition.

## Observed Android Constraints
- Intermittent network transitions can produce quick foreground/background oscillation; session events rely on transition-aware logic.
- Low-memory devices are more sensitive to large local caches; capped queue and compact literacy payloads reduce risk.

## Operational Risks Discovered
- Analytics query helpers still rely on user-scoped event modeling; cross-tenant aggregate analytics requires explicit service-role workflows.
- AI literacy offline guarantee depends on at least one successful initial load per device.
- Governance audit still flags historical raw candidate (`lib/commerce/TransactionLifecycleManager.ts`) outside this sprint scope.
