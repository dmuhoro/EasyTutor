/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js';

type UserEventRow = {
  user_id: string;
  event_name: string;
  learning_mode: string | null;
  timestamp: string;
};

function getClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function toDayKey(ts: string) {
  return new Date(ts).toISOString().slice(0, 10);
}

function plusDays(dayKey: string, days: number) {
  const d = new Date(dayKey);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  if (process.env.ANALYTICS_REPORT_DRY_RUN === '1') {
    console.log('=== RETENTION REPORT (DRY RUN) ===');
    console.log('Users: 0');
    console.log('D1 Retention: 0.0000');
    console.log('D7 Retention: 0.0000');
    console.log('Average Sessions/User: 0.00');
    console.log('');
    console.log('Portal Engagement Distribution');
    console.log('- high_school: 0.0000 (0 events)');
    console.log('- university: 0.0000 (0 events)');
    console.log('- self_directed: 0.0000 (0 events)');
    return;
  }

  const client = getClient();
  const { data, error } = await client
    .from('user_events')
    .select('user_id, event_name, learning_mode, timestamp');

  if (error) throw error;
  const rows = (data ?? []) as UserEventRow[];
  if (rows.length === 0) {
    console.log('Retention Report: no user_events rows found');
    return;
  }

  const byUser = new Map<string, UserEventRow[]>();
  const portalCounts = new Map<string, number>();
  const sessionsByUser = new Map<string, number>();
  for (const row of rows) {
    byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row]);
    const portal = row.learning_mode || 'unknown';
    portalCounts.set(portal, (portalCounts.get(portal) ?? 0) + 1);
    if (row.event_name === 'session_started') {
      sessionsByUser.set(row.user_id, (sessionsByUser.get(row.user_id) ?? 0) + 1);
    }
  }

  let d1Retained = 0;
  let d7Retained = 0;
  for (const [, events] of byUser.entries()) {
    const days = new Set(events.map((e) => toDayKey(e.timestamp)));
    const sorted = [...days].sort();
    if (sorted.length === 0) continue;
    const cohort = sorted[0];
    if (days.has(plusDays(cohort, 1))) d1Retained++;
    if (days.has(plusDays(cohort, 7))) d7Retained++;
  }

  const userCount = byUser.size;
  const totalSessions = [...sessionsByUser.values()].reduce((a, b) => a + b, 0);
  const avgSessionsPerUser = userCount > 0 ? totalSessions / userCount : 0;
  const portalTotal = [...portalCounts.values()].reduce((a, b) => a + b, 0);

  console.log('=== RETENTION REPORT ===');
  console.log(`Users: ${userCount}`);
  console.log(`D1 Retention: ${(userCount > 0 ? d1Retained / userCount : 0).toFixed(4)}`);
  console.log(`D7 Retention: ${(userCount > 0 ? d7Retained / userCount : 0).toFixed(4)}`);
  console.log(`Average Sessions/User: ${avgSessionsPerUser.toFixed(2)}`);
  console.log('');
  console.log('Portal Engagement Distribution');
  for (const [portal, count] of portalCounts.entries()) {
    const ratio = portalTotal > 0 ? count / portalTotal : 0;
    console.log(`- ${portal}: ${ratio.toFixed(4)} (${count} events)`);
  }
}

void main().catch((err) => {
  console.error('retention_report failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
