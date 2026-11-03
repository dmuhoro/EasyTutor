# Pass 5 – Security (read-only)
npm audit:
Zod can exhaust memory while validating oversized constrained collections - https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
fix available via `npm audit fix`
node_modules/expo/node_modules/zod
node_modules/zod

57 vulnerabilities (5 low, 30 moderate, 21 high, 1 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues possible (including breaking changes), run:
  npm audit fix --force

Some issues need review, and may require choosing
a different dependency.

EXPO_PUBLIC var names:
EXPO_PUBLIC_ANTHROPIC_API_KEY
EXPO_PUBLIC_CLOUD_API_KEY
EXPO_PUBLIC_FOLDER
EXPO_PUBLIC_GROQ_API_KEY
EXPO_PUBLIC_OLLAMA_HOST
EXPO_PUBLIC_PROJECT_ROOT
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_USE_RN_FETCH
