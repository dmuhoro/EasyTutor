# Known Issues & Technical Debt

## AI & Retrieval
- **Semantic Chunking:** The current naive character-based chunking can split sentences or mathematical formulas, degrading retrieval quality.
- **Ollama Latency:** Cold starts of the local Ollama instance can lead to request timeouts on the first interaction.
- **Embedding Inconsistency:** If the local embedding model is updated, the entire `document_chunks` table must be re-embedded to maintain vector consistency.

## Performance
- **Ingestion Blocking:** Document processing (chunking + embedding) happens on the main JS thread, potentially causing UI freezes for large files.
- **Vector Search Scaling:** Cosine similarity scans in pgvector without an index will become slow once chunks exceed 10k+.
- **Asset Loading:** High-resolution icons and gradients in the UI can cause frame drops on low-end Android devices.

## Architecture
- **Localhost Dependency:** The current offline mode strictly requires an Ollama instance on `http://localhost:11434`, which is not yet accessible on physical mobile devices without tunneling.
- **Auth Race Conditions:** Occasional race conditions during app launch where the Supabase session is not fully resolved before the first portal-specific query.

## Infrastructure
- **EAS Build Time:** Native builds are currently taking >15 minutes due to heavy dependency graphs.
- **Environment Leakage:** Risk of cloud API keys being accidentally included in the native bundle if not correctly handled via `expo-constants`.
