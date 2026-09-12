import { fetchUserEvents } from '../db/analyticsClient';
import { safeNumber, toIsoDayRange } from '../db/queryGuards';

type SessionRecord = {
  event_name: string;
  learning_mode: string | null;
  timestamp: string;
  metadata?: Record<string, any> | null;
};

type RetentionSummary = {
  portal: string;
  cohort_size: number;
  d1_retention_rate: number;
  d7_retention_rate: number;
};

export async function getDailyActiveUsers(dateIso?: string): Promise<number> {
  const range = toIsoDayRange(dateIso);
  const { data, error } = await fetchUserEvents(
    'user_id, timestamp, event_name, learning_mode',
    (query) => query.gte('timestamp', range.start).lt('timestamp', range.end),
  );
  if (error || !data) return 0;
  return new Set(data.map((row) => row.user_id)).size;
}

export async function getPortalRetention(): Promise<RetentionSummary[]> {
  const { data, error } = await fetchUserEvents(
    'event_name, learning_mode, timestamp, user_id',
    (query) => query.order('timestamp', { ascending: true }),
  );

  if (error || !data || data.length === 0) return [];
  const events = data as SessionRecord[];

  const byPortal = new Map<string, Date[]>();
  for (const row of events) {
    const portal = row.learning_mode || 'unknown';
    const list = byPortal.get(portal) ?? [];
    list.push(new Date(row.timestamp));
    byPortal.set(portal, list);
  }

  return [...byPortal.entries()].map(([portal, timestamps]) => {
    const uniqueDays = new Set(timestamps.map((t) => t.toISOString().slice(0, 10)));
    const days = [...uniqueDays].sort();
    if (days.length === 0) {
      return { portal, cohort_size: 0, d1_retention_rate: 0, d7_retention_rate: 0 };
    }
    const cohort = new Date(days[0]);
    const d1 = new Date(cohort);
    d1.setDate(d1.getDate() + 1);
    const d7 = new Date(cohort);
    d7.setDate(d7.getDate() + 7);
    const hasD1 = uniqueDays.has(d1.toISOString().slice(0, 10));
    const hasD7 = uniqueDays.has(d7.toISOString().slice(0, 10));
    return {
      portal,
      cohort_size: 1,
      d1_retention_rate: hasD1 ? 1 : 0,
      d7_retention_rate: hasD7 ? 1 : 0,
    };
  });
}

export async function getAverageSessionDuration(): Promise<number> {
  const { data, error } = await fetchUserEvents(
    'event_name, timestamp, user_id, learning_mode',
    (query) => query
      .in('event_name', ['session_started', 'session_ended'])
      .order('timestamp', { ascending: true }),
  );

  if (error || !data || data.length === 0) return 0;
  const events = data as Array<{ event_name: string; timestamp: string }>;
  let currentStart: number | null = null;
  const durationsMs: number[] = [];

  for (const event of events) {
    const ts = new Date(event.timestamp).getTime();
    if (event.event_name === 'session_started') currentStart = ts;
    if (event.event_name === 'session_ended' && currentStart !== null && ts >= currentStart) {
      durationsMs.push(ts - currentStart);
      currentStart = null;
    }
  }

  if (durationsMs.length === 0) return 0;
  const avgMs = durationsMs.reduce((sum, value) => sum + value, 0) / durationsMs.length;
  return Math.round(avgMs / 1000);
}

export async function getQuizCompletionRate(): Promise<number> {
  const { data, error } = await fetchUserEvents(
    'event_name, user_id, learning_mode, timestamp',
    (query) => query.in('event_name', ['quiz_started', 'quiz_completed']),
  );

  if (error || !data || data.length === 0) return 0;
  const rows = data as Array<{ event_name: string }>;
  const started = rows.filter((row) => row.event_name === 'quiz_started').length;
  const completed = rows.filter((row) => row.event_name === 'quiz_completed').length;
  if (started === 0) return 0;
  return safeNumber(Number((completed / started).toFixed(4)));
}
