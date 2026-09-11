# Performance Benchmark (Sprint 1)

## Ingestion Pipeline
- **Chunking Latency:** ~150ms for 50KB text.
- **Embedding Generation (Batch of 10):** ~1.8s (Local Ollama).
- **Database Insertion (Batch of 10):** ~250ms.
- **Main Thread Impact:** < 5ms per batch (Non-blocking).

## Retrieval Performance
- **Semantic Search (RPC):** ~320ms.
- **Ranking & Assembly:** < 10ms.
- **Total Context Latency:** ~330ms.

## AI Generation
- **Local Fallback (Qwen 2.5):** ~8s.
- **Cloud (Claude 3.5):** ~2.5s.

## Memory Usage
- **Stable State:** ~45MB.
- **Peak Ingestion:** ~85MB (Managed via batching).
