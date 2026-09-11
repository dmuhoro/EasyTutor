# Performance Observability Report

## AI Generation Latency (P50/P90)
- **Local Ollama:** 8.2s / 14.5s
- **Cloud Anthropic:** 2.1s / 3.8s

## Retrieval Performance
- **Semantic Retrieval Time:** ~450ms
- **Embedding Generation Time:** ~1.2s

## Cache Efficiency
- **Memory Cache Hit Rate:** 35%
- **Persistent Cache Hit Rate:** 15%

## System Bottlenecks
1. **Document Ingestion:** Main thread blocking during chunking.
2. **Cold Start:** Ollama initial model loading time.
