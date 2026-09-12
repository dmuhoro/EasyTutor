import { logEvent } from './logEvent';
import { supabase, supabaseInitStatus } from './supabase';
import { getSupabaseClient, logSupabaseError } from './supabaseOps';

export async function runDiagnostics() {
  const env = {
    urlExists: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
    keyExists: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };

  const diagnostics = {
    env,
    supabaseInitStatus,
    clientAvailable: !!supabase,
  };

  await logEvent('INFO', 'diagnostics_start', diagnostics);

  const client = getSupabaseClient();
  const { data, error, status, statusText } = await client
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    logSupabaseError('profiles', 'select', error);
    const payload = {
      ...diagnostics,
      error,
      status,
      statusText,
    };
    await logEvent('ERROR', 'diagnostics_supabase_query_failed', payload);
    return {
      ok: false,
      ...payload,
    };
  }

  const payload = {
    ...diagnostics,
    status,
    statusText,
    rowCount: data?.length ?? 0,
  };

  await logEvent('INFO', 'diagnostics_supabase_query_success', payload);
  return {
    ok: true,
    ...payload,
  };
}
