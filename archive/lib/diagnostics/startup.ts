import { validateEnvironment } from './envCheck';
import { checkLocalAIHealth } from '../bridge/healthcheck';
import { getSupabaseClient } from '../supabaseOps';

export interface StartupReport {
  env: boolean;
  supabase: boolean;
  localAI: boolean;
  errors: string[];
}

/**
 * Runs a full suite of system diagnostics at app startup.
 */
export const runStartupDiagnostics = async (): Promise<StartupReport> => {
  const report: StartupReport = {
    env: false,
    supabase: false,
    localAI: false,
    errors: [],
  };

  // 1. Env Check
  const envRes = validateEnvironment();
  report.env = envRes.valid;
  if (!envRes.valid) {
    report.errors.push(...(envRes.errors || []));
  }

  // 2. Supabase Connection
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('subjects').select('count', { count: 'estimated', head: true });
    report.supabase = !error;
    if (error) report.errors.push(`Supabase: ${error.message}`);
  } catch (err) {
    report.errors.push(`Supabase: ${err instanceof Error ? err.message : 'Connection failed'}`);
  }

  // 3. Local AI Health
  const aiHealth = await checkLocalAIHealth(1000);
  report.localAI = aiHealth.online;
  if (!aiHealth.online) {
    console.info('[DIAGNOSTICS] Local AI is offline. Will use Cloud/Cache.');
  }

  return report;
};
