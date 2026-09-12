/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js';

type AILogRow = {
  provider: string;
  portal: string | null;
  latency_ms: number | null;
  success: boolean;
  estimated_cost_usd: number | null;
};

function getClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

async function main() {
  if (process.env.ANALYTICS_REPORT_DRY_RUN === '1') {
    console.log('=== AI COST REPORT (DRY RUN) ===');
    console.log('Total Calls: 0');
    console.log('Average Latency (ms): 0.00');
    console.log('Success %: 0.00');
    console.log('Failure Rate: 0.0000');
    console.log('');
    console.log('Cost by Provider');
    console.log('- hosted_claude: $0.000000');
    console.log('- hosted_groq: $0.000000');
    console.log('- local_ollama: $0.000000');
    console.log('');
    console.log('Cost by Portal');
    console.log('- high_school: $0.000000');
    console.log('- university: $0.000000');
    console.log('- self_directed: $0.000000');
    return;
  }

  const client = getClient();
  const { data, error } = await client
    .from('ai_call_logs')
    .select('provider, portal, latency_ms, success, estimated_cost_usd');

  if (error) throw error;
  const rows = (data ?? []) as AILogRow[];
  if (rows.length === 0) {
    console.log('AI Cost Report: no ai_call_logs rows found');
    return;
  }

  const byProvider = new Map<string, AILogRow[]>();
  const byPortal = new Map<string, AILogRow[]>();
  for (const row of rows) {
    const providerKey = row.provider || 'unknown';
    const portalKey = row.portal || 'unknown';
    byProvider.set(providerKey, [...(byProvider.get(providerKey) ?? []), row]);
    byPortal.set(portalKey, [...(byPortal.get(portalKey) ?? []), row]);
  }

  const allLatency = rows.map((r) => r.latency_ms ?? 0);
  const successCount = rows.filter((r) => r.success).length;
  const failureCount = rows.length - successCount;
  const successPct = (successCount / rows.length) * 100;
  const failureRate = failureCount / rows.length;
  const avgLatency = sum(allLatency) / allLatency.length;

  console.log('=== AI COST REPORT ===');
  console.log(`Total Calls: ${rows.length}`);
  console.log(`Average Latency (ms): ${avgLatency.toFixed(2)}`);
  console.log(`Success %: ${successPct.toFixed(2)}`);
  console.log(`Failure Rate: ${failureRate.toFixed(4)}`);
  console.log('');

  console.log('Cost by Provider');
  for (const [provider, providerRows] of byProvider.entries()) {
    const cost = sum(providerRows.map((r) => r.estimated_cost_usd ?? 0));
    console.log(`- ${provider}: $${cost.toFixed(6)}`);
  }

  console.log('');
  console.log('Cost by Portal');
  for (const [portal, portalRows] of byPortal.entries()) {
    const cost = sum(portalRows.map((r) => r.estimated_cost_usd ?? 0));
    console.log(`- ${portal}: $${cost.toFixed(6)}`);
  }
}

void main().catch((err) => {
  console.error('ai_cost_report failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
