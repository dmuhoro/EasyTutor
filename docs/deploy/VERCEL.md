# Vercel build

Required environment NAMES (set in Vercel project, never committed):
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY
The build runs `node scripts/check_build_env.mjs` first and fails closed if either is
missing or malformed. See git history / these names.