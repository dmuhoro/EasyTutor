export const validateEnvironment = () => {
  const env = {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    ollamaEndpoint: 'http://localhost:11434',
    cloudApiKey: process.env.EXPO_PUBLIC_CLOUD_API_KEY
  };

  const missing = [];

  if (!env.supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!env.supabaseKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    console.warn(`[ENV] Missing environment variables: ${missing.join(', ')}. App may run in degraded offline mode.`);
  } else {
    console.log('[ENV] Environment validated successfully.');
  }

  return env;
};
