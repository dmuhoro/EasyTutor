# Recurring Failures & Gotchas

## Supabase
- **Null Client Instance:** Supabase client can be null in early app lifecycle. Always use getSupabaseClient() helper.
- **RLS Policy Drift:** Adding new tables without RLS policies results in silent data leakage or access denied.

## Testing
- **State Leakage:** Tests in Vitest can leak state if cleanup() is not called in beforeEach/afterEach.
