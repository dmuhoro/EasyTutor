# ADR 005: Semantic Search Architecture

## Problem
Naive keyword-based search is insufficient for finding relevant academic context in large textbooks or documents where the student might use synonyms or ask conceptual questions.

## Decision
Standardize on **Semantic Similarity Search** using:
- **Model:** `qwen2.5-coder:1.5b` (Ollama) for generating 384-dim embeddings.
- **Distance Metric:** Cosine Similarity via pgvector's `<=>` operator.
- **Implementation:** `lib/retrieval.ts` calls a Supabase RPC `match_document_chunks`.

## Reasoning
Cosine similarity is robust for high-dimensional vector space comparisons, making the search more "meaning-aware" rather than just "word-aware."

## Consequences
- All ingested text must be embedded with the *exact* same model to be searchable.
- Any model change requires a full re-embedding of the knowledge base.

## Future Implications
Enables cross-lingual retrieval (if the embedding model supports it) and multi-modal search (text-to-diagram) in future versions.
