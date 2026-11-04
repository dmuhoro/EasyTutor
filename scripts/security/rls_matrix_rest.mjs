#!/usr/bin/env node
/**
 * rls_matrix_rest.mjs — prove the RLS matrix over real PostgREST + real JWTs.
 *
 * Two modes, same assertions:
 *
 *   staging (default)
 *     Reads EASYTUTOR_TEST_ENV (default $HOME/.config/easytutor/test.env) and
 *     signs learners A and B in through GoTrue with their real passwords.
 *     Required keys: SUPABASE_URL, SUPABASE_ANON_KEY,
 *                    SUPABASE_TEST_USER_A_EMAIL/PASSWORD,
 *                    SUPABASE_TEST_USER_B_EMAIL/PASSWORD.
 *
 *   local (--mode local)
 *     Talks to the throwaway PostgREST started by
 *     scripts/security/run_rls_matrix_local.sh and signs HS256 JWTs directly
 *     (the same contract PostgREST validates). Required:
 *                    RLS_REST_URL, RLS_JWT_SECRET, RLS_ANON_KEY,
 *                    RLS_LEARNER_A_ID, RLS_LEARNER_B_ID,
 *                    RLS_TOPIC_ID, RLS_SUBJECT_ID.
 *
 * It never prints token, key, email, or password values. It only prints
 * table/operation/expected/actual/verdict, and exits non-zero on any FAIL.
 */

import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

const MODE = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1]
  : (process.env.RLS_MODE || 'staging');

const now = Date.now();
const suffix = `${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ── output ───────────────────────────────────────────────────────────────────
const rows = [];
let fails = 0;
let blocked = 0;

function pad(value, width) {
  const s = String(value ?? '');
  return s.length >= width ? s.slice(0, width) : s + ' '.repeat(width - s.length);
}

function record(table, operation, expected, actual, verdict) {
  if (verdict === 'FAIL') fails += 1;
  if (verdict === 'BLOCKED') blocked += 1;
  rows.push({ table, operation, expected, actual, verdict });
  const line = [
    pad(table, 28),
    pad(operation, 26),
    pad(expected, 30),
    pad(actual, 34),
    verdict,
  ].join(' | ');
  console.log(line);
}

function pass(table, operation, expected, actual) { record(table, operation, expected, actual, 'PASS'); }
function fail(table, operation, expected, actual) { record(table, operation, expected, actual, 'FAIL'); }
function skip(table, operation, expected, actual) { record(table, operation, expected, actual, 'BLOCKED'); }

// ── env loading (staging) ────────────────────────────────────────────────────
function parseEnvFile(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`cannot read EASYTUTOR_TEST_ENV at ${path}`);
  }
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // The committed staging fixture is written as `...<value>` (a deliberate
    // redaction marker). Strip exactly one leading marker and say so — failing
    // here would only hide the fact that the file needs review.
    if (value.startsWith('...')) {
      value = value.slice(3);
      console.warn('WARN: stripped a literal leading "..." from an EASYTUTOR_TEST_ENV value');
    }
    env[m[1]] = value;
  }
  return env;
}

function requireEnv(env, keys, source) {
  const missing = keys.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`missing required ${source} key(s): ${missing.join(', ')}`);
  }
}

// ── jwt ──────────────────────────────────────────────────────────────────────
function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signJwt(secret, payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

// ── http ─────────────────────────────────────────────────────────────────────
async function call(baseUrl, method, path, { token, apikey, body, prefer } = {}) {
  const headers = { apikey, Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: null,
    });
  } catch (error) {
    return { status: 0, json: null, text: `network error: ${error.name}` };
  }

  const text = await response.text();
  let json = null;
  if (text) {
    try { json = JSON.parse(text); } catch { /* non-json body */ }
  }
  return { status: response.status, json, text };
}

function affected(result) {
  if (Array.isArray(result.json)) return result.json.length;
  return 0;
}

function denied(status, count) {
  return status === 401 || status === 403 || (status >= 200 && status < 300 && count === 0);
}

function isSuccess(status) {
  return status >= 200 && status < 300;
}

// ── table matrix ─────────────────────────────────────────────────────────────
// kind:
//   user       owner CRUD (select/insert/update/delete)
//   append     owner select+insert only
//   corpus     knowledge_chunks: shared-or-own read, own write
//   public_ref anon+authenticated read, no writes
//   auth_ref   authenticated read, no anon, no writes
const SPEC = [
  { table: 'profiles', kind: 'user', owner: 'id', seed: () => ({ email: `et-proof-${suffix}@example.test` }), patch: { xp_total: 424242 } },
  { table: 'user_progress', kind: 'user', owner: 'user_id', needsTopic: true, conflict: 'user_id,topic_id', seed: () => ({}), patch: { attempts: 999 } },
  { table: 'user_topic_progress', kind: 'user', owner: 'user_id', needsTopic: true, conflict: 'user_id,topic_id', seed: () => ({ status: 'unlocked' }), patch: { attempts: 999 } },
  { table: 'quiz_sessions', kind: 'user', owner: 'user_id', needsTopic: true, seed: () => ({ score: 1, total: 2 }), patch: { score: -7 } },
  { table: 'cached_roadmaps', kind: 'user', owner: 'user_id', needsTopic: true, conflict: 'user_id,topic_id', seed: () => ({ roadmap_json: { proof: suffix } }), patch: { completion_status: 'completed' } },
  { table: 'ai_feedback', kind: 'user', owner: 'user_id', seed: () => ({ content_type: 'quiz', rating: 'positive', topic: 'proof' }), patch: { feedback_text: 'et-sentinel' } },
  { table: 'user_feedback', kind: 'user', owner: 'user_id', seed: () => ({ rating: 'good', source: 'proof' }), patch: { comment: 'et-sentinel' } },
  { table: 'ai_literacy_progress', kind: 'user', owner: 'user_id', conflict: 'user_id,unit_number', seed: () => ({ unit_number: 900 + (now % 90) }), patch: { score: 7 } },
  { table: 'practice_sessions', kind: 'user', owner: 'user_id', seed: () => ({ subject: 'proof', topic: 'proof', difficulty: 'easy', score: 1 }), patch: { score: 0.123 } },
  { table: 'subject_mastery', kind: 'user', owner: 'user_id', seed: () => ({ subject: `proof-${suffix}`, topic: 'proof' }), patch: { mastery_percent: 12.34 } },
  { table: 'learning_recommendations', kind: 'user', owner: 'user_id', seed: () => ({ recommendation_key: `et-${suffix}`, subject: 'proof', topic: 'proof', title: 'proof', reason: 'proof', action_label: 'proof', recommendation_type: 'practice' }), patch: { priority: 77 } },
  { table: 'performance_profiles', kind: 'user', owner: 'user_id', seed: () => ({ subject: `proof-${suffix}`, topic: 'proof' }), patch: { session_count: 77 } },
  { table: 'learning_trend_snapshots', kind: 'user', owner: 'user_id', seed: () => ({ subject: 'proof', topic: `proof-${suffix}` }), patch: { session_count: 77 } },
  { table: 'learning_identities', kind: 'user', owner: 'user_id', conflict: 'user_id', seed: () => ({ learner_type: 'self_directed', preferred_learning_style: 'text' }), patch: { target_outcomes: [{ sentinel: true }] } },
  { table: 'knowledge_paths', kind: 'user', owner: 'user_id', seed: () => ({ path_goal: 'proof', status: 'active' }), patch: { status: 'paused' } },
  { table: 'learning_interventions', kind: 'user', owner: 'user_id', seed: () => ({ topicId: 'proof', subjectId: 'proof', type: 'review_topic' }), patch: { plan: 'et-sentinel' } },
  { table: 'learning_plans', kind: 'user', owner: 'user_id', seed: () => ({}), patch: { weeklyPlan: { sentinel: true } } },
  { table: 'learning_risk_predictions', kind: 'user', owner: 'user_id', seed: () => ({ topicId: 'proof', subjectId: 'proof', severity: 'LOW' }), patch: { reason: 'et-sentinel' } },
  { table: 'learning_coach_reports', kind: 'user', owner: 'user_id', seed: () => ({ coaching_summary: 'proof', learning_health_trajectory: 'stable' }), patch: { coaching_summary: 'et-sentinel' } },
  { table: 'learning_retention_profiles', kind: 'user', owner: 'user_id', seed: () => ({ subject_id: 'proof', topic_id: 'proof', level: 'topic' }), patch: { review_count: 77 } },
  { table: 'adaptive_learning_paths', kind: 'user', owner: 'user_id', seed: () => ({ current_position: { n: 1 }, destination: { n: 2 }, recommended_path: [{ n: 1 }] }), patch: { explanation: 'et-sentinel' } },
  { table: 'learning_goals', kind: 'user', owner: 'user_id', seed: () => ({ topic: `proof-${suffix}` }), patch: { data: { sentinel: true } } },
  { table: 'documents', kind: 'user', owner: 'user_id', seed: () => ({ title: 'proof' }), patch: { title: 'et-sentinel' } },
  {
    table: 'document_chunks',
    kind: 'user',
    owner: 'user_id',
    prepare: async (learner) => {
      const doc = await call(baseUrl, 'POST', '/documents', {
        token: learner.token,
        apikey,
        body: { user_id: learner.id, title: `proof-parent-${suffix}` },
        prefer: 'return=representation',
      });
      if (!isSuccess(doc.status) || !Array.isArray(doc.json) || !doc.json[0]?.id) {
        throw new Error(`could not create parent document (status ${doc.status})`);
      }
      return { document_id: doc.json[0].id, content: 'proof' };
    },
    cleanup: async (spec, learner, chunkId) => {
      const chunk = await selectOne('document_chunks', learner.token, chunkId);
      const documentId = Array.isArray(chunk.json) && chunk.json[0]?.document_id;
      if (documentId) {
        await call(baseUrl, 'DELETE', `/documents?id=eq.${documentId}`, { token: learner.token, apikey });
      }
    },
    patch: { content: 'et-sentinel' },
  },
  { table: 'learning_evidence', kind: 'append', owner: 'user_id', seed: () => ({ client_event_id: `et-${suffix}`, skill_id: 'proof', activity_id: 'proof', dimension: 'recall', score: 0.5 }), patch: { score: 0.25 } },
  { table: 'user_events', kind: 'append', owner: 'user_id', seed: () => ({ event_type: 'proof', payload: { suffix } }), patch: { event_type: 'et-sentinel' } },
  { table: 'ai_call_logs', kind: 'append', owner: 'user_id', seed: () => ({ feature: 'proof', provider: 'placeholder', success: false }), patch: { success: true } },
  { table: 'knowledge_chunks', kind: 'corpus', owner: 'user_id', seed: () => ({ chunk_text: 'proof', source: 'proof' }), patch: { chunk_text: 'et-sentinel' } },
  { table: 'subjects', kind: 'public_ref', writeBody: () => ({ id: `proof-${suffix}`, name: 'Proof', level: 'high_school' }), patchBody: () => ({ name: 'et-sentinel' }) },
  { table: 'topics', kind: 'public_ref', writeBody: () => ({ id: randomUUID(), subject_id: subjectId, title: 'Proof' }), patchBody: () => ({ title: 'et-sentinel' }) },
  { table: 'knowledge_nodes', kind: 'public_ref', writeBody: () => ({ id: `proof-${suffix}`, title: 'Proof', description: 'Proof', difficulty_level: 1, category: 'concept' }), patchBody: () => ({ title: 'et-sentinel' }) },
  { table: 'question_bank', kind: 'auth_ref', writeBody: () => ({ subject: 'proof', topic: 'proof', difficulty: 'easy', question: 'proof?', options: [], correct_answer: 'a' }), patchBody: () => ({ question: 'et-sentinel?' }) },
  { table: 'ai_literacy_content', kind: 'auth_ref', writeBody: () => ({ unit_number: 900 + (now % 90), title: 'Proof', objective: 'Proof' }), patchBody: () => ({ title: 'et-sentinel' }) },
  { table: 'cached_responses', kind: 'auth_ref', writeBody: () => ({ topic_id: topicId, mode: 'proof', response_text: 'proof' }), patchBody: () => ({ response_text: 'et-sentinel' }) },
];

// `cached_responses` has no owner column and may not exist yet; it is included
// as an auth-reference table so anon cannot read it.

// ── bootstrap ────────────────────────────────────────────────────────────────
let baseUrl;
let authBase;
let apikey;
let anonToken;
let learnerA;
let learnerB;
let topicId;
const subjectId = process.env.RLS_SUBJECT_ID || 'et-proof-subject';

async function goTrueSignIn(url, key, email, password) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!response.ok || !json?.access_token || !json?.user?.id) {
    throw new Error(`GoTrue sign-in failed (status ${response.status}: ${json?.error_description || json?.msg || 'no token'})`);
  }
  return { token: json.access_token, id: json.user.id };
}

async function bootstrapStaging() {
  const file = resolve(process.env.EASYTUTOR_TEST_ENV || `${homedir()}/.config/easytutor/test.env`);
  const env = parseEnvFile(file);
  requireEnv(env, [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_TEST_USER_A_EMAIL',
    'SUPABASE_TEST_USER_A_PASSWORD',
    'SUPABASE_TEST_USER_B_EMAIL',
    'SUPABASE_TEST_USER_B_PASSWORD',
  ], 'staging');

  baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  authBase = baseUrl;
  baseUrl = `${authBase}/rest/v1`;
  apikey = env.SUPABASE_ANON_KEY;
  anonToken = apikey;

  learnerA = await goTrueSignIn(authBase, apikey, env.SUPABASE_TEST_USER_A_EMAIL, env.SUPABASE_TEST_USER_A_PASSWORD);
  learnerB = await goTrueSignIn(authBase, apikey, env.SUPABASE_TEST_USER_B_EMAIL, env.SUPABASE_TEST_USER_B_PASSWORD);

  // Discover a usable topic for the FK-bound tables. Never invent one: the
  // learner cannot write reference data, so a missing topic is a real blocker.
  const topic = await call(baseUrl, 'GET', '/topics?select=id&limit=1', { token: anonToken, apikey });
  topicId = Array.isArray(topic.json) && topic.json[0]?.id ? topic.json[0].id : null;
}

async function bootstrapLocal() {
  baseUrl = (process.env.RLS_REST_URL || '').replace(/\/+$/, '');
  const secret = process.env.RLS_JWT_SECRET || '';
  apikey = process.env.RLS_ANON_KEY || '';
  const aId = process.env.RLS_LEARNER_A_ID || '';
  const bId = process.env.RLS_LEARNER_B_ID || '';
  if (!baseUrl || !secret || !apikey || !aId || !bId) {
    throw new Error('local mode requires RLS_REST_URL, RLS_JWT_SECRET, RLS_ANON_KEY, RLS_LEARNER_A_ID, RLS_LEARNER_B_ID');
  }

  const mint = (id) => signJwt(secret, {
    aud: 'authenticated',
    role: 'authenticated',
    sub: id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  learnerA = { id: aId, token: mint(aId) };
  learnerB = { id: bId, token: mint(bId) };
  anonToken = signJwt(secret, {
    aud: 'authenticated',
    role: 'anon',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  topicId = process.env.RLS_TOPIC_ID || null;
}

// ── assertions ───────────────────────────────────────────────────────────────
async function selectOne(table, token, id) {
  return call(baseUrl, 'GET', `/${table}?id=eq.${id}&select=*`, { token, apikey });
}

async function seed(table, spec, learner) {
  if (spec.prepare) return spec.prepare(learner);
  return spec.seed();
}

function withOwner(spec, learner, payload) {
  const body = { ...payload };
  if (spec.owner === 'id') body.id = learner.id;
  else body.user_id = learner.id;
  return body;
}

async function insertRow(table, learner, body, conflictColumns) {
  const query = conflictColumns ? `?on_conflict=${encodeURIComponent(conflictColumns)}` : '';
  return call(baseUrl, 'POST', `/${table}${query}`, {
    token: learner.token,
    apikey,
    body,
    prefer: conflictColumns
      ? 'resolution=merge-duplicates,return=representation'
      : 'return=representation',
  });
}

async function ensureProfiles() {
  // Profiles are provisioned by the auth trigger in a real project. This proof
  // never fabricates a profile (that would overwrite a real email): it only
  // confirms the row the trigger should have created, and blocks if it is
  // missing.
  for (const learner of [learnerA, learnerB]) {
    const existing = await selectOne('profiles', learner.token, learner.id);
    if (isSuccess(existing.status) && Array.isArray(existing.json) && existing.json.length === 1) {
      pass('profiles', 'provision', 'row exists', 'row exists');
    } else {
      skip('profiles', 'provision', 'row exists', `status ${existing.status}, rows ${affected(existing)}`);
    }
  }
}

async function runUser(spec) {
  const needsTopic = spec.needsTopic && !topicId;
  if (needsTopic) {
    skip(spec.table, 'all operations', 'topic reference present', 'no topics row; seed reference data first');
    return;
  }

  let a;
  let b;
  if (spec.alreadyProvisioned) {
    const ra = await selectOne(spec.table, learnerA.token, learnerA.id);
    const rb = await selectOne(spec.table, learnerB.token, learnerB.id);
    a = { status: ra.status, json: ra.json };
    b = { status: rb.status, json: rb.json };
  } else {
    const seedA = await seed(spec, spec, learnerA);
    const seedB = await seed(spec, spec, learnerB);
    if (spec.needsTopic) {
      seedA.topic_id = topicId;
      seedB.topic_id = topicId;
    }
    a = await insertRow(spec.table, learnerA, withOwner(spec, learnerA, seedA), spec.conflict);
    b = await insertRow(spec.table, learnerB, withOwner(spec, learnerB, seedB), spec.conflict);
  }

  if (!isSuccess(a.status) || !Array.isArray(a.json) || !a.json[0]?.id) {
    skip(spec.table, 'insert own', '2xx', `status ${a.status} (${(a.text || '').slice(0, 60)})`);
    skip(spec.table, 'all operations', 'owner row seeded', 'could not seed owner row');
    return;
  }
  if (!isSuccess(b.status) || !Array.isArray(b.json) || !b.json[0]?.id) {
    skip(spec.table, 'insert other', '2xx', `status ${b.status} (${(b.text || '').slice(0, 60)})`);
    skip(spec.table, 'all operations', 'peer row seeded', 'could not seed peer row');
    return;
  }

  if (spec.alreadyProvisioned) pass(spec.table, 'provision', 'own row exists', 'own row exists');
  else pass(spec.table, 'insert own', '2xx', `${a.status}`);

  const aId = a.json[0].id;
  const bId = b.json[0].id;

  const ownRead = await selectOne(spec.table, learnerA.token, aId);
  if (isSuccess(ownRead.status) && Array.isArray(ownRead.json) && ownRead.json.length === 1) {
    pass(spec.table, 'select own', '1 row', '1 row');
  } else {
    fail(spec.table, 'select own', '1 row', `status ${ownRead.status}, rows ${affected(ownRead)}`);
  }

  const crossRead = await selectOne(spec.table, learnerA.token, bId);
  if (denied(crossRead.status, affected(crossRead))) {
    pass(spec.table, 'select other', 'denied / 0 rows', `${crossRead.status}, ${affected(crossRead)} rows`);
  } else {
    fail(spec.table, 'select other', 'denied / 0 rows', `${crossRead.status}, ${affected(crossRead)} rows`);
  }

  // An owner must not be able to re-home a row to another account. This is the
  // WITH CHECK boundary: the row is theirs on the way in, but the new owner id
  // must also be theirs on the way out.
  if (spec.owner === 'user_id') {
    const rehome = await call(baseUrl, 'PATCH', `/${spec.table}?id=eq.${aId}`, {
      token: learnerA.token,
      apikey,
      body: { user_id: learnerB.id },
      prefer: 'return=representation',
    });
    const stillOwned = await selectOne(spec.table, learnerA.token, aId);
    const stolen = await selectOne(spec.table, learnerB.token, aId);
    if (denied(rehome.status, affected(rehome)) && affected(stillOwned) === 1 && affected(stolen) === 0) {
      pass(spec.table, 're-home own row', 'denied / unchanged owner', `${rehome.status}, ${affected(rehome)} rows`);
    } else {
      fail(spec.table, 're-home own row', 'denied / unchanged owner', `${rehome.status}, ${affected(rehome)} rows, stolen=${affected(stolen)}`);
    }
  }

  const before = await selectOne(spec.table, learnerB.token, bId);
  const beforeRow = Array.isArray(before.json) && before.json[0] ? before.json[0] : null;
  const patchKey = Object.keys(spec.patch)[0];
  const beforeValue = beforeRow ? JSON.stringify(beforeRow[patchKey]) : 'missing';
  const crossUpdate = await call(baseUrl, 'PATCH', `/${spec.table}?id=eq.${bId}`, {
    token: learnerA.token,
    apikey,
    body: spec.patch,
    prefer: 'return=representation',
  });
  const after = await selectOne(spec.table, learnerB.token, bId);
  const afterRow = Array.isArray(after.json) && after.json[0] ? after.json[0] : null;
  const afterValue = afterRow ? JSON.stringify(afterRow[patchKey]) : 'missing';
  if (denied(crossUpdate.status, affected(crossUpdate)) && afterValue === beforeValue) {
    pass(spec.table, 'update other', 'denied, unchanged', `${crossUpdate.status}, ${affected(crossUpdate)} rows`);
  } else {
    fail(spec.table, 'update other', 'denied, unchanged', `${crossUpdate.status}, ${affected(crossUpdate)} rows, changed=${afterValue !== beforeValue}`);
  }

  const crossDelete = await call(baseUrl, 'DELETE', `/${spec.table}?id=eq.${bId}`, {
    token: learnerA.token,
    apikey,
    prefer: 'return=representation',
  });
  const stillThere = await selectOne(spec.table, learnerB.token, bId);
  if (denied(crossDelete.status, affected(crossDelete)) && affected(stillThere) === 1) {
    pass(spec.table, 'delete other', 'denied, row remains', `${crossDelete.status}, ${affected(crossDelete)} rows`);
  } else {
    fail(spec.table, 'delete other', 'denied, row remains', `${crossDelete.status}, ${affected(crossDelete)} rows, remaining=${affected(stillThere)}`);
  }

  const anonRead = await call(baseUrl, 'GET', `/${spec.table}?select=*&limit=1`, { token: anonToken, apikey });
  if (denied(anonRead.status, affected(anonRead))) {
    pass(spec.table, 'anon select', 'denied / 0 rows', `${anonRead.status}, ${affected(anonRead)} rows`);
  } else {
    fail(spec.table, 'anon select', 'denied / 0 rows', `${anonRead.status}, ${affected(anonRead)} rows`);
  }

  const anonInsert = await call(baseUrl, 'POST', `/${spec.table}`, {
    token: anonToken,
    apikey,
    body: withOwner(spec, learnerB, spec.prepare ? {} : spec.seed()),
  });
  if (anonInsert.status === 401 || anonInsert.status === 403) {
    pass(spec.table, 'anon insert', '401/403', `${anonInsert.status}`);
  } else {
    fail(spec.table, 'anon insert', '401/403', `${anonInsert.status}`);
  }

  // Cleanup (owner rows only). Profiles are provisioned rows and are kept.
  if (spec.table !== 'profiles') {
    if (spec.cleanup) await spec.cleanup(spec, learnerA, aId);
    if (spec.cleanup) await spec.cleanup(spec, learnerB, bId);
    await call(baseUrl, 'DELETE', `/${spec.table}?id=eq.${bId}`, { token: learnerB.token, apikey });
    await call(baseUrl, 'DELETE', `/${spec.table}?id=eq.${aId}`, { token: learnerA.token, apikey });
  }
}

async function runAppend(spec) {
  const seedPayload = (learner) => withOwner(spec, learner, spec.seed());
  const a = await insertRow(spec.table, learnerA, seedPayload(learnerA));
  const b = await insertRow(spec.table, learnerB, seedPayload(learnerB));

  if (!isSuccess(a.status) || !Array.isArray(a.json) || !a.json[0]?.id) {
    skip(spec.table, 'insert own', '2xx', `status ${a.status}`);
    skip(spec.table, 'all operations', 'owner row seeded', 'append-only insert failed');
    return;
  }
  pass(spec.table, 'insert own', '2xx', `${a.status}`);

  const aId = a.json[0].id;

  const ownRead = await selectOne(spec.table, learnerA.token, aId);
  if (isSuccess(ownRead.status) && affected(ownRead) === 1) {
    pass(spec.table, 'select own', '1 row', '1 row');
  } else {
    fail(spec.table, 'select own', '1 row', `status ${ownRead.status}, rows ${affected(ownRead)}`);
  }

  const patchKey = Object.keys(spec.patch)[0];
  const before = await selectOne(spec.table, learnerA.token, aId);
  const beforeValue = Array.isArray(before.json) && before.json[0] ? JSON.stringify(before.json[0][patchKey]) : 'missing';
  const ownUpdate = await call(baseUrl, 'PATCH', `/${spec.table}?id=eq.${aId}`, {
    token: learnerA.token,
    apikey,
    body: spec.patch,
    prefer: 'return=representation',
  });
  const after = await selectOne(spec.table, learnerA.token, aId);
  const afterValue = Array.isArray(after.json) && after.json[0] ? JSON.stringify(after.json[0][patchKey]) : 'missing';
  if (denied(ownUpdate.status, affected(ownUpdate)) && afterValue === beforeValue) {
    pass(spec.table, 'update own (append-only)', 'denied, unchanged', `${ownUpdate.status}, ${affected(ownUpdate)} rows`);
  } else {
    fail(spec.table, 'update own (append-only)', 'denied, unchanged', `${ownUpdate.status}, ${affected(ownUpdate)} rows`);
  }

  const ownDelete = await call(baseUrl, 'DELETE', `/${spec.table}?id=eq.${aId}`, {
    token: learnerA.token,
    apikey,
    prefer: 'return=representation',
  });
  const remain = await selectOne(spec.table, learnerA.token, aId);
  if (denied(ownDelete.status, affected(ownDelete)) && affected(remain) === 1) {
    pass(spec.table, 'delete own (append-only)', 'denied, row remains', `${ownDelete.status}, ${affected(ownDelete)} rows`);
  } else {
    fail(spec.table, 'delete own (append-only)', 'denied, row remains', `${ownDelete.status}, ${affected(ownDelete)} rows`);
  }

  if (isSuccess(b.status) && Array.isArray(b.json) && b.json[0]?.id) {
    const bId = b.json[0].id;
    const crossRead = await selectOne(spec.table, learnerA.token, bId);
    if (denied(crossRead.status, affected(crossRead))) {
      pass(spec.table, 'select other', 'denied / 0 rows', `${crossRead.status}, ${affected(crossRead)} rows`);
    } else {
      fail(spec.table, 'select other', 'denied / 0 rows', `${crossRead.status}, ${affected(crossRead)} rows`);
    }
  } else {
    skip(spec.table, 'select other', 'peer row seeded', `status ${b.status}`);
  }

  const anonRead = await call(baseUrl, 'GET', `/${spec.table}?select=*&limit=1`, { token: anonToken, apikey });
  if (denied(anonRead.status, affected(anonRead))) {
    pass(spec.table, 'anon select', 'denied / 0 rows', `${anonRead.status}, ${affected(anonRead)} rows`);
  } else {
    fail(spec.table, 'anon select', 'denied / 0 rows', `${anonRead.status}, ${affected(anonRead)} rows`);
  }

  // Append-only rows cannot be cleaned up through the learner API. They are
  // keyed by a run-unique value so repeated proof runs stay distinguishable.
  // No verdict row: retention is the designed behaviour, not a gap.
}

async function runCorpus(spec) {
  const a = await insertRow(spec.table, learnerA, withOwner(spec, learnerA, spec.seed()));
  const b = await insertRow(spec.table, learnerB, withOwner(spec, learnerB, spec.seed()));

  if (!isSuccess(a.status) || affected(a) !== 1) {
    skip(spec.table, 'insert own', '2xx', `status ${a.status}`);
    return;
  }
  pass(spec.table, 'insert own', '2xx', `${a.status}`);

  const aId = a.json[0].id;
  const ownRead = await selectOne(spec.table, learnerA.token, aId);
  if (affected(ownRead) === 1) pass(spec.table, 'select own', '1 row', '1 row');
  else fail(spec.table, 'select own', '1 row', `status ${ownRead.status}, rows ${affected(ownRead)}`);

  if (isSuccess(b.status) && affected(b) === 1) {
    const bId = b.json[0].id;
    const crossRead = await selectOne(spec.table, learnerA.token, bId);
    if (denied(crossRead.status, affected(crossRead))) pass(spec.table, 'select other', 'denied / 0 rows', `${crossRead.status}, 0 rows`);
    else fail(spec.table, 'select other', 'denied / 0 rows', `${crossRead.status}, ${affected(crossRead)} rows`);

    const crossUpdate = await call(baseUrl, 'PATCH', `/${spec.table}?id=eq.${bId}`, {
      token: learnerA.token, apikey, body: spec.patch, prefer: 'return=representation',
    });
    if (denied(crossUpdate.status, affected(crossUpdate))) pass(spec.table, 'update other', 'denied', `${crossUpdate.status}, ${affected(crossUpdate)} rows`);
    else fail(spec.table, 'update other', 'denied', `${crossUpdate.status}, ${affected(crossUpdate)} rows`);

    const crossDelete = await call(baseUrl, 'DELETE', `/${spec.table}?id=eq.${bId}`, {
      token: learnerA.token, apikey, prefer: 'return=representation',
    });
    if (denied(crossDelete.status, affected(crossDelete))) pass(spec.table, 'delete other', 'denied', `${crossDelete.status}, ${affected(crossDelete)} rows`);
    else fail(spec.table, 'delete other', 'denied', `${crossDelete.status}, ${affected(crossDelete)} rows`);

    await call(baseUrl, 'DELETE', `/${spec.table}?id=eq.${bId}`, { token: learnerB.token, apikey });
  } else {
    skip(spec.table, 'select other', 'peer row seeded', `status ${b.status}`);
  }

  const anonRead = await call(baseUrl, 'GET', `/${spec.table}?select=*&limit=1`, { token: anonToken, apikey });
  if (denied(anonRead.status, affected(anonRead))) pass(spec.table, 'anon select', 'denied / 0 rows', `${anonRead.status}, ${affected(anonRead)} rows`);
  else fail(spec.table, 'anon select', 'denied / 0 rows', `${anonRead.status}, ${affected(anonRead)} rows`);

  await call(baseUrl, 'DELETE', `/${spec.table}?id=eq.${aId}`, { token: learnerA.token, apikey });
}

async function runReference(spec, { anonMayRead }) {
  const read = await call(baseUrl, 'GET', `/${spec.table}?select=*&limit=1`, { token: anonToken, apikey });
  if (anonMayRead) {
    if (isSuccess(read.status)) pass(spec.table, 'anon select', '2xx', `${read.status}`);
    else fail(spec.table, 'anon select', '2xx', `${read.status}`);
  } else if (denied(read.status, affected(read))) {
    pass(spec.table, 'anon select', 'denied / 0 rows', `${read.status}, ${affected(read)} rows`);
  } else {
    fail(spec.table, 'anon select', 'denied / 0 rows', `${read.status}, ${affected(read)} rows`);
  }

  const authRead = await call(baseUrl, 'GET', `/${spec.table}?select=*&limit=1`, { token: learnerA.token, apikey });
  if (isSuccess(authRead.status)) pass(spec.table, 'authenticated select', '2xx', `${authRead.status}`);
  else fail(spec.table, 'authenticated select', '2xx', `${authRead.status}`);

  const write = await call(baseUrl, 'POST', `/${spec.table}`, {
    token: learnerA.token,
    apikey,
    body: spec.writeBody(),
  });
  if (write.status === 401 || write.status === 403) pass(spec.table, 'authenticated insert', '401/403', `${write.status}`);
  else fail(spec.table, 'authenticated insert', '401/403', `${write.status}`);

  const update = await call(baseUrl, 'PATCH', `/${spec.table}?limit=1`, {
    token: learnerA.token, apikey, body: spec.patchBody(), prefer: 'return=representation',
  });
  // A reference table has no write policy AND no write grant, so a write must
  // be refused by the grant layer (401/403). A 2xx with zero rows would mean
  // the privilege survived and only RLS happened to hide every row.
  if (update.status === 401 || update.status === 403) pass(spec.table, 'authenticated update', '401/403', `${update.status}`);
  else fail(spec.table, 'authenticated update', '401/403', `${update.status}, ${affected(update)} rows`);

  const del = await call(baseUrl, 'DELETE', `/${spec.table}?limit=1`, {
    token: learnerA.token, apikey, prefer: 'return=representation',
  });
  if (del.status === 401 || del.status === 403) pass(spec.table, 'authenticated delete', '401/403', `${del.status}`);
  else fail(spec.table, 'authenticated delete', '401/403', `${del.status}, ${affected(del)} rows`);
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`RLS matrix REST proof — mode=${MODE}`);
  console.log([pad('table', 28), pad('operation', 26), pad('expected', 30), pad('actual', 34), 'verdict'].join(' | '));
  console.log('-'.repeat(140));

  if (MODE === 'local') await bootstrapLocal();
  else await bootstrapStaging();

  console.log(`learners: A=${learnerA.id.slice(0, 8)}… B=${learnerB.id.slice(0, 8)}… topic=${topicId ? topicId.slice(0, 8) + '…' : 'MISSING'}`);
  console.log('-'.repeat(140));

  await ensureProfiles();

  for (const spec of SPEC) {
    if (spec.table === 'profiles') continue;
    if (spec.kind === 'user') await runUser(spec);
    else if (spec.kind === 'append') await runAppend(spec);
    else if (spec.kind === 'corpus') await runCorpus(spec);
    else if (spec.kind === 'public_ref') await runReference(spec, { anonMayRead: true });
    else if (spec.kind === 'auth_ref') await runReference(spec, { anonMayRead: false });
  }

  // profiles was provisioned above; still prove cross-owner denial on it.
  await runUser({ table: 'profiles', kind: 'user', owner: 'id', seed: () => ({ email: `et-proof-${suffix}@example.test` }), patch: { xp_total: 424242 }, alreadyProvisioned: true });

  console.log('-'.repeat(140));
  const total = rows.length;
  console.log(`rows=${total} pass=${total - fails - blocked} fail=${fails} blocked=${blocked}`);
  if (fails > 0) process.exit(1);
  if (blocked > 0) process.exit(2);
}

main().catch((error) => {
  console.error(`FATAL: ${error.message}`);
  process.exit(3);
});
