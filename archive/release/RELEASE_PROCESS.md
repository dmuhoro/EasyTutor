# Release Process

## 1. Preparation
- [ ] Run `node scripts/qa/qa_runner.js`.
- [ ] Ensure all specs in /specs/in-progress are moved to /specs/completed.
- [ ] Bump version in package.json (Semantic Versioning).

## 2. Validation
- [ ] Verify local Ollama connectivity.
- [ ] Check Supabase RLS policies for new tables.

## 3. Execution
- [ ] Run `npx expo export` for web or `eas build` for native.
- [ ] Tag the release in GitHub.
