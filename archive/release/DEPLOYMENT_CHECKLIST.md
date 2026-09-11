# EasyTutor v1.0.0: Deployment Checklist

## 1. Environment & Infrastructure
- [ ] Supabase: Verify all migrations in `supabase/migrations/` are applied.
- [ ] Supabase: Enable RLS on all production tables.
- [ ] Vercel: Create project and link to GitHub repository.
- [ ] Vercel: Add all variables from `.env.example` to Vercel Settings.

## 2. Build & Artifacts
- [ ] Run `npm run typecheck` locally to ensure zero build-time errors.
- [ ] Run `npm run test` to verify all 74+ flow tests pass.
- [ ] Execute `npx expo export --platform web` locally to verify bundle generation.

## 3. UI/UX Polish
- [ ] Verify `GlassView` and `ProgressRing` render correctly in Web.
- [ ] Check mobile responsiveness in browser responsive mode.
- [ ] Ensure `TutorMode` transitions are smooth.

## 4. Final Sanity Check
- [ ] Verify `lib/bridge` defaults to `localhost` if no host is discovered.
- [ ] Ensure `public` branch contains only the decoupled Engine/Architecture.

## 5. Launch
- [ ] Push to `master` (or production branch).
- [ ] Verify Vercel deployment logs for "Successful Build".
- [ ] Perform a live smoke test of the RAG pipeline.
