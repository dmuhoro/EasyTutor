# ADR 003: Local-First RAG with pgvector

## Problem
Users need to learn from specific books or documents they upload. Sending large amounts of document text to cloud LLMs on every query is expensive and slow.

## Decision
Implement a **Local-First RAG (Retrieval-Augmented Generation)** pipeline.
1. **Local Embeddings:** Use local Ollama to generate 384-dimensional embeddings for document chunks.
2. **Cloud Storage/Search:** Store chunks and vectors in Supabase `pgvector`.
3. **Semantic Retrieval:** Perform cosine similarity search via Supabase RPC to retrieve the top 5 most relevant chunks.
4. **Context Injection:** Inject only the relevant chunks into the AI prompt.

## Reasoning
This minimizes tokens sent to the LLM, improves response relevance, and keeps the vector generation costs at zero by performing it locally.

## Consequences
- Requires the `vector` extension in Supabase.
- Document ingestion is tied to local machine performance.

## Future Implications
Enables personalized "Knowledge Banks" that can be queried instantly across different portals without re-processing the entire source text.
