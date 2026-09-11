# EasyTutor v1.0.0: Launch Execution

## 1. Prepare Public Release Branch
```bash
# 1. Create a clean release branch
git checkout -b release/v1.0.0

# 2. Add all new files
git add .

# 3. Commit the Infrastructure Evolution
git commit -m "feat: EasyTutor v1.0.0 - Production AI Infrastructure Launch"

# 4. Push to remote
git push origin release/v1.0.0
```

## 2. Vercel Deployment Commands
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Link and Deploy (First time)
vercel link
vercel env pull .env.production
vercel deploy --prod
```

## 3. Fallback Debugging Steps
- **Build Failure:** Check `dist` directory locally using `npx expo export --platform web`. If it fails locally, it will fail on Vercel.
- **Supabase Error:** Ensure `EXPO_PUBLIC_SUPABASE_URL` is correctly set in Vercel environment variables.
- **AI Timeout:** Check `lib/network.ts` to ensure timeouts are set to at least 15s for cloud providers.
- **Blank Screen:** Inspect browser console for "Failed to load resource" errors (usually pathing issues).

## 4. Recruiter/Founder Presentation
When sharing the link:
> "Check out EasyTutor: https://easytutor.vercel.app. It's a demonstration of offline-first AI infrastructure. Try the Document Ingestion and Quiz adaptive flow. Note the sub-second retrieval times powered by HNSW indexing."
