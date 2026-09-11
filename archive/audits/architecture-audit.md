# Architecture Audit: EasyTutor

## Summary
The EasyTutor architecture is robust, utilizing a multi-portal strategy that effectively isolates syllabus-specific logic. The hybrid AI routing and local-first RAG provide a significant competitive advantage in terms of resilience and cost.

## Scores (Out of 10)
- **Code Health & Modularity:** 9.0
- **Network Resilience:** 9.5
- **Scalability:** 7.5
- **AI Intelligence:** 8.5
- **Offline Readiness:** 8.0

## Strengths
- **Clean Boundaries:** Clear separation between portals and shared logic (`lib/`).
- **Resilience:** Industry-grade safety utilities (timeouts, retries, deduplication).
- **Extensibility:** The "Professor" model makes adding new portals (e.g., "Professional Certs") straightforward.

## Weaknesses
- **Main Thread Blocking:** Heavy AI processing during ingestion.
- **Localhost Tying:** Hardcoded localhost dependency for Ollama.
- **Database Consistency:** Naive ID handling in some legacy areas (being addressed in Spec 001).

## Recommendations
1. **Move ingestion to workers:** Decouple chunking/embedding from the UI thread.
2. **Abstract Ollama Endpoint:** Allow dynamic URL configuration for physical device testing.
3. **Formalize ADRs:** Ensure every architectural pivot is documented in `/decisions`.
