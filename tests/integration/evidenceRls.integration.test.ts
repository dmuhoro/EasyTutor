/// <reference types="node" />
/**
 * Real PostgREST + RLS integration coverage for learning evidence.
 *
 * Runs only through scripts/security/run_evidence_rest_tests.sh, which starts
 * the official Supabase Postgres image + PostgREST, applies the committed
 * migrations and supplies:
 *   EVIDENCE_REST_URL
 *   EVIDENCE_REST_JWT_SECRET
 *
 * JWTs are signed exactly as Supabase signs them (HS256, role + sub), so RLS
 * reads the same claims it would in production.
 */
import { createHmac } from 'node:crypto';
import { createServer, request as httpRequest, type Server } from 'node:http';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createEvidence } from '../../src/domain/evidence/evidenceService';
import { createSupabaseEvidenceWriter } from '../../src/infrastructure/evidence/supabaseEvidenceWriter';
import { createSupabaseEvidenceRepository } from '../../src/infrastructure/evidence/supabaseEvidenceRepository';
import type { EvidenceClient } from '../../src/infrastructure/evidence/evidenceClient';

const REST_URL = process.env.EVIDENCE_REST_URL ?? '';
const SECRET = process.env.EVIDENCE_REST_JWT_SECRET ?? '';
const LEARNER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LEARNER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

let baseUrl = REST_URL;
let proxy: Server | undefined;

/**
 * supabase-js always prefixes REST calls with `/rest/v1`; standalone PostgREST
 * serves at the root. This transparent proxy bridges the two so the test
 * exercises the real PostgREST HTTP surface rather than a re-implementation.
 */
async function startRestProxy(target: string): Promise<{ server: Server; port: number }> {
  const parsed = new URL(target);
  const server = createServer((req, res) => {
    const path = (req.url ?? '/').replace(/^\/rest\/v1/, '') || '/';
    const upstream = httpRequest(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path,
        method: req.method,
        headers: { ...req.headers, host: parsed.host },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      },
    );
    upstream.on('error', () => {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: 'proxy upstream unavailable' }));
    });
    req.pipe(upstream);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to bind REST proxy');
  return { server, port: address.port };
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function signJwt(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + 3600 }));
  const signature = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

const anonToken = () => signJwt({ role: 'anon', iss: 'supabase' });
const learnerToken = (sub: string) => signJwt({ role: 'authenticated', sub, aud: 'authenticated', iss: 'supabase' });

function learnerClient(sub: string): SupabaseClient {
  return createClient(baseUrl, anonToken(), {
    auth: { persistSession: false, autoRefreshToken: false },
    accessToken: async () => learnerToken(sub),
  });
}

function anonClient(): SupabaseClient {
  return createClient(baseUrl, anonToken(), {
    auth: { persistSession: false, autoRefreshToken: false },
    accessToken: async () => anonToken(),
  });
}

function rowFor(userId: string, eventId: string, overrides: Record<string, unknown> = {}) {
  return {
    user_id: userId,
    client_event_id: eventId,
    subject_id: 'mathematics',
    skill_id: 'fractions',
    activity_id: 'diagnostic-v1',
    dimension: 'application',
    score: 1,
    independent: true,
    hints: 0,
    provenance: 'learner_action',
    ...overrides,
  };
}

/** Adapts a PostgREST client to the writer port (session identity is supplied by the signed token). */
function writerClient(rest: SupabaseClient, userId: string): EvidenceClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: userId } }, error: null }),
    },
    from: () => ({
      insert: (rows: unknown) => rest.from('learning_evidence').insert(rows as never) as never,
      select: (columns: string | undefined) => rest.from('learning_evidence').select(columns) as never,
    }),
  } as unknown as EvidenceClient;
}

describe.skipIf(!REST_URL || !SECRET)('learning evidence over real PostgREST + RLS', () => {
  let a: SupabaseClient;
  let b: SupabaseClient;
  let anon: SupabaseClient;

  beforeAll(async () => {
    if (REST_URL) {
      const started = await startRestProxy(REST_URL);
      proxy = started.server;
      baseUrl = `http://127.0.0.1:${started.port}`;
    }
    a = learnerClient(LEARNER_A);
    b = learnerClient(LEARNER_B);
    anon = anonClient();
  });

  afterAll(async () => {
    if (proxy) await new Promise<void>((resolve) => proxy?.close(() => resolve()));
  });

  it('authenticated learner can insert their own evidence', async () => {
    const { error } = await a.from('learning_evidence').insert(rowFor(LEARNER_A, 'rest-a-1'));
    expect(error).toBeNull();
  });

  it('duplicate client event ids are rejected by the unique constraint', async () => {
    const { error } = await a.from('learning_evidence').insert(rowFor(LEARNER_A, 'rest-a-1'));
    expect(error?.code).toBe('23505');
  });

  it('learner cannot insert evidence under another identity', async () => {
    const { error } = await a.from('learning_evidence').insert(rowFor(LEARNER_B, 'forged-by-a'));
    expect(error?.code).toBe('42501');
  });

  it('learner only reads their own evidence', async () => {
    const { data, error } = await a.from('learning_evidence').select('client_event_id,user_id');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].user_id).toBe(LEARNER_A);
  });

  it('second learner sees an isolated dataset', async () => {
    const { error } = await b.from('learning_evidence').insert(rowFor(LEARNER_B, 'rest-b-1'));
    expect(error).toBeNull();

    const { data } = await b.from('learning_evidence').select('client_event_id,user_id');
    expect(data).toHaveLength(1);
    expect(data?.[0].user_id).toBe(LEARNER_B);

    const { data: aData } = await a.from('learning_evidence').select('client_event_id');
    expect(aData).toHaveLength(1);
  });

  it('anonymous requests cannot read or write private evidence', async () => {
    const { data } = await anon.from('learning_evidence').select('client_event_id');
    expect(data ?? []).toHaveLength(0);

    const { error } = await anon.from('learning_evidence').insert(rowFor(LEARNER_A, 'anon-write'));
    expect(error?.code).toBe('42501');
  });

  it('accepted evidence is append-only: update and delete are denied', async () => {
    const update = await a.from('learning_evidence').update({ score: 0.1 }).eq('client_event_id', 'rest-a-1');
    expect(update.error?.code).toBe('42501');

    const del = await a.from('learning_evidence').delete().eq('client_event_id', 'rest-b-1');
    expect(del.error?.code).toBe('42501');
  });

  it('database constraints reject invalid evidence', async () => {
    const { error } = await a.from('learning_evidence').insert(rowFor(LEARNER_A, 'bad-score', { score: 1.5 }));
    expect(error?.code).toBe('23514');
  });

  it('the concrete writer persists over REST and is idempotent', async () => {
    const writer = createSupabaseEvidenceWriter(() => writerClient(a, LEARNER_A));
    const record = createEvidence({
      userId: LEARNER_A,
      clientEventId: 'writer-event-1',
      subjectId: 'mathematics',
      skillId: 'equations',
      activityId: 'practice-v1',
      dimension: 'application',
      score: 0.8,
      independent: true,
      hints: 0,
    });

    expect(await writer.write(record)).toEqual({ ok: true });
    expect(await writer.write(record)).toEqual({ ok: true, duplicate: true });
  });

  it('the writer refuses a mismatched owner before reaching the database', async () => {
    const writer = createSupabaseEvidenceWriter(() => writerClient(a, LEARNER_A));
    const record = createEvidence({
      userId: LEARNER_B,
      clientEventId: 'forged-by-writer',
      skillId: 'fractions',
      activityId: 'practice-v1',
      dimension: 'application',
      score: 1,
      independent: true,
      hints: 0,
    });
    expect(await writer.write(record)).toMatchObject({ ok: false, code: 'identity_mismatch' });
  });

  it('the repository reads the authenticated learner’s persisted evidence', async () => {
    const repository = createSupabaseEvidenceRepository(() => writerClient(a, LEARNER_A) as unknown as EvidenceClient);
    const result = await repository.listForLearner(LEARNER_A);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records.length).toBeGreaterThanOrEqual(2);
    expect(result.records.every((r) => r.userId === LEARNER_A)).toBe(true);
    expect(result.records.find((r) => r.clientEventId === 'writer-event-1')?.score).toBe(0.8);
  });
});
