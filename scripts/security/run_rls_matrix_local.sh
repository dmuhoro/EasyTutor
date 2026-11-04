#!/usr/bin/env bash
# ============================================================================
# LOCAL-ONLY RLS matrix proof.
#
# Starts a throwaway postgres:16 + PostgREST, applies the structural fixture and
# the real 20261104_rls_hardening.sql migration, seeds two learners, then runs
# scripts/security/rls_matrix_rest.mjs with signed learner JWTs.
#
# This never touches staging or production. It proves the migration, not the
# cloud project: use run_rls_matrix_staging.sh for the real staging evidence.
#
# Requirements: docker, curl, node
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NET="${RLS_NET:-et-rls-net}"
PG="${RLS_PG:-et-rls-pg}"
REST="${RLS_CONTAINER:-et-rls-rest}"
PG_PORT="${RLS_PG_PORT:-55441}"
REST_PORT="${RLS_REST_PORT:-55443}"
PG_IMAGE="${RLS_PG_IMAGE:-postgres:16}"
REST_IMAGE="${RLS_REST_IMAGE:-public.ecr.aws/supabase/postgrest:v16.1}"
JWT_SECRET="${RLS_JWT_SECRET:-local-rls-proof-secret-with-at-least-32-characters}"
LEARNER_A="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
LEARNER_B="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
TOPIC_ID="11111111-1111-4111-8111-111111111111"
SUBJECT_ID="et-proof-subject"

cleanup() {
  docker rm -f "$REST" "$PG" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "▶ preparing isolated network and Postgres"
docker rm -f "$REST" "$PG" >/dev/null 2>&1 || true
docker network rm "$NET" >/dev/null 2>&1 || true
docker network create "$NET" >/dev/null
docker run -d --name "$PG" --network "$NET" -p "${PG_PORT}:5432" \
  -e POSTGRES_PASSWORD=postgres "$PG_IMAGE" >/dev/null

# The postgres image boots a temporary server for initdb, then restarts. Wait
# for two stable, consecutive connections so we never run DDL in that gap.
sleep 3
ready=0
for _ in $(seq 1 60); do
  if docker exec "$PG" psql -U postgres -d postgres -c 'select 1' >/dev/null 2>&1; then
    sleep 2
    if docker exec "$PG" psql -U postgres -d postgres -c 'select 1' >/dev/null 2>&1; then
      ready=1
      break
    fi
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "FATAL: Postgres did not become ready" >&2
  exit 1
fi

echo "▶ bootstrapping auth stub and REST roles"
docker exec -i "$PG" psql -U postgres -v ON_ERROR_STOP=1 -q <<'SQL'
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid $$;
create or replace function auth.role() returns text
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'role', '') $$;

do $$ begin if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if; end $$;
do $$ begin if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if; end $$;
do $$ begin if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login password 'postgres'; end if; end $$;

grant anon, authenticated to authenticator;
grant usage on schema public to authenticator, anon, authenticated;
grant usage on schema auth to authenticator, anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant execute on function auth.role() to anon, authenticated;
SQL

echo "▶ applying structural fixture"
docker exec -i "$PG" psql -U postgres -v ON_ERROR_STOP=1 -q \
  < "$ROOT/scripts/security/fixtures/rls_fixture.sql"

echo "▶ applying 20261104_rls_hardening.sql"
if [ "${RLS_PROOF_UNHARDENED:-0}" = "1" ]; then
  echo "   (RLS_PROOF_UNHARDENED=1: applying the deliberately insecure baseline instead)"
  docker exec -i "$PG" psql -U postgres -v ON_ERROR_STOP=1 -q \
    < "$ROOT/scripts/security/fixtures/no_rls_baseline.sql"
else
  docker exec -i "$PG" psql -U postgres -v ON_ERROR_STOP=1 -q \
    < "$ROOT/supabase/migrations/20261104_rls_hardening.sql"

  echo "▶ applying it a second time (idempotency)"
  docker exec -i "$PG" psql -U postgres -v ON_ERROR_STOP=1 -q \
    < "$ROOT/supabase/migrations/20261104_rls_hardening.sql"
fi

echo "▶ seeding learners and reference rows"
docker exec -i "$PG" psql -U postgres -v ON_ERROR_STOP=1 -q <<SQL
insert into auth.users (id, email) values
  ('$LEARNER_A', 'learner.a@example.test'),
  ('$LEARNER_B', 'learner.b@example.test')
on conflict (id) do nothing;

insert into public.profiles (id, email) values
  ('$LEARNER_A', 'learner.a@example.test'),
  ('$LEARNER_B', 'learner.b@example.test')
on conflict (id) do nothing;

insert into public.subjects (id, name, level) values
  ('$SUBJECT_ID', 'Proof Subject', 'high_school')
on conflict (id) do nothing;

insert into public.topics (id, subject_id, title) values
  ('$TOPIC_ID', '$SUBJECT_ID', 'Proof Topic')
on conflict (id) do nothing;
SQL

echo "▶ starting PostgREST"
docker run -d --name "$REST" --network "$NET" -p "${REST_PORT}:3000" \
  -e PGRST_DB_URI="postgres://authenticator:postgres@${PG}:5432/postgres" \
  -e PGRST_DB_SCHEMAS="public" \
  -e PGRST_DB_ANON_ROLE="anon" \
  -e PGRST_JWT_SECRET="$JWT_SECRET" \
  "$REST_IMAGE" >/dev/null

for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:${REST_PORT}/" >/dev/null 2>&1 && break
  sleep 1
done
curl -sf "http://127.0.0.1:${REST_PORT}/" >/dev/null

echo "▶ running RLS matrix assertions"
if [ "${RLS_PROOF_UNHARDENED:-0}" = "1" ]; then
  set +e
  RLS_MODE=local \
  RLS_REST_URL="http://127.0.0.1:${REST_PORT}" \
  RLS_JWT_SECRET="$JWT_SECRET" \
  RLS_ANON_KEY="local-anon" \
  RLS_LEARNER_A_ID="$LEARNER_A" \
  RLS_LEARNER_B_ID="$LEARNER_B" \
  RLS_TOPIC_ID="$TOPIC_ID" \
  RLS_SUBJECT_ID="$SUBJECT_ID" \
  node --dns-result-order=ipv4first "$ROOT/scripts/security/rls_matrix_rest.mjs" --mode local
  rc=$?
  set -e
  if [ "$rc" -ne 0 ]; then
    echo "✅ defect reproduced: harness failed without the hardening migration (exit $rc)"
    exit 0
  fi
  echo "FATAL: harness passed against the insecure baseline — the proof is not detecting the defect" >&2
  exit 1
fi

RLS_MODE=local \
RLS_REST_URL="http://127.0.0.1:${REST_PORT}" \
RLS_JWT_SECRET="$JWT_SECRET" \
RLS_ANON_KEY="local-anon" \
RLS_LEARNER_A_ID="$LEARNER_A" \
RLS_LEARNER_B_ID="$LEARNER_B" \
RLS_TOPIC_ID="$TOPIC_ID" \
RLS_SUBJECT_ID="$SUBJECT_ID" \
node --dns-result-order=ipv4first "$ROOT/scripts/security/rls_matrix_rest.mjs" --mode local

echo "✅ local RLS matrix proof passed"
