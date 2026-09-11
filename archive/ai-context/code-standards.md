# Code Standards: EasyTutor

## TypeScript & Types
- **Strict Mode:** Always use strict TypeScript. No `any` unless absolutely unavoidable (and documented).
- **Explicit Returns:** Define explicit return types for all functions.
- **Interfaces over Types:** Use `interface` for object definitions and `type` for unions/aliases.

## Naming Conventions
- **Files:** `camelCase.ts` for utilities, `PascalCase.tsx` for components.
- **Variables/Functions:** `camelCase`.
- **Constants:** `SCREAMING_SNAKE_CASE`.
- **Portals:** Folder names in `app/` should match the portal name (e.g., `(high_school)`).

## Supabase & Database
- **RLS:** Every table must have RLS enabled.
- **Client Access:** Always use the `getSupabaseClient()` utility to handle potential null instances.
- **Queries:** Avoid `select('*')`. Be explicit about required columns.
- **Migrations:** Never modify existing migration files. Always create a new one for schema changes.

## Error Handling & Defensive Programming
- **Graceful Failure:** Use `try-catch` blocks in all AI and network operations.
- **Timeouts:** All AI generations must wrapped in `withTimeout`.
- **Retries:** Use `retryAsync` for flaky network calls.
- **Deduplication:** Prevent multiple identical inflight requests using `deduplicateRequest`.

## Component Patterns
- **Functional Components:** Always use arrow function components with `React.FC` or explicit props interfaces.
- **NativeWind:** Use `className` with Tailwind classes for all styling. Avoid inline `style` objects.
- **Props:** Destructure props in the function signature.

## State Management (Zustand)
- **Selectors:** Use selective state hooks to prevent unnecessary re-renders.
- **Persistence:** Use the `persist` middleware with `AsyncStorage` for state that must survive app restarts.

## Logging
- **Tags:** Use bracketed tags for logs (e.g., `[AI]`, `[DB]`, `[ERROR]`).
- **Context:** Always log relevant context (IDs, params) when logging errors.
- **Production:** Ensure sensitive data (API keys, PII) is never logged.
