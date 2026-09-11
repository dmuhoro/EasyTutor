# Spec 006: Background Worker Architecture

## Goal
Implement a robust background worker architecture for long-running AI tasks like curriculum pre-generation or deep document analysis.

## Design
- **Queue:** Use a simple persistence-backed queue in `AsyncStorage` or a Supabase `jobs` table.
- **Worker:** Implement a background task using `expo-background-fetch` that processes the queue when the app is in the background or idle.

## Implementation Boundaries
- **Files:** `services/worker.ts`, `hooks/useBackgroundQueue.ts`.

## Verification Checklist
- [ ] Tasks added to the queue are processed sequentially.
- [ ] Failed tasks are retried up to 3 times with backoff.
- [ ] User is notified when a background task completes.
