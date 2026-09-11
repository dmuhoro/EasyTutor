# Spec 004: Batch Ingestion Optimization

## Goal
Optimize the document ingestion pipeline to handle large files without blocking the main UI thread.

## Design
- **Worker Pattern:** Use `react-native-worklets` or `expo-task-manager` to move the heavy embedding generation loop off the main thread.
- **Batching:** Send embeddings to Supabase in batches of 10-20 chunks rather than individually.

## Implementation Boundaries
- **Files:** `lib/knowledge.ts`, `lib/embeddings.ts`.

## Verification Checklist
- [ ] UI remains responsive (60fps) during document ingestion.
- [ ] Network requests to Supabase are consolidated into batches.
- [ ] Error handling correctly reports which batch failed.
