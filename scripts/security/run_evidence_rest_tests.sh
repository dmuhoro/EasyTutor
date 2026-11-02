#!/usr/bin/env bash
# ============================================================================
# End-to-end evidence RLS verification over PostgREST.
#
# Brings up the official Supabase Postgres image + PostgREST, applies the real
# migrations, then runs tests/integration/evidenceRls.integration.test.ts with
# real signed learner JWTs (role=authenticated, sub=<learner uuid>).
#
# No GoTrue/Auth server is required: JWTs are signed with the same HS256 secret
# PostgREST is configured with, which is exactly the token contract RLS reads.
#
# Requirements: docker, curl
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NET="${REST_NET:-easytutor-evidence-net}"
PG="${REST_PG:-easytutor-evidence-pg}"
REST="${REST_CONTAINER:-easytutor-evidence-rest}"
PG_PORT="${REST_PG_PORT:-55432}"
REST_PORT="${REST_PORT:-55434}"
PG_IMAGE="${RLS_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.159}"
REST_IMAGE="${REST_IMAGE:-public.ecr.aws/supabase/postgrest:v16.1}"
JWT_SECRET="${REST_JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}"

cleanup() {
  docker rm -f "$REST" "$PG" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "▶ Preparing isolated network and database"
docker rm -f "$REST" "$PG" >/dev/null 2>&1 || true
docker network rm "$NET" >/dev/null 2>&1 || true
docker network create "$NET" >/dev/null
docker run -d --name "$PG" --network "$NET" -p "${PG_PORT}:5432" \
  -e POSTGRES_PASSWORD=postgres "$PG_IMAGE" >/dev/null

for _ in $(seq 1 60); do
  docker exec "$PG" pg_isready -U supabase_admin >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$PG" pg_isready -U supabase_admin >/dev/null

echo "▶ Applying migrations and REST role grants"
docker exec "$PG" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -c \
  "DO \$\$ BEGIN
     PERFORM 1;
     -- Drop any DDL-watching event triggers that can break schema migrations in the image.
     EXECUTE 'DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch';
     EXECUTE 'DROP EVENT TRIGGER IF EXISTS pgrst_drop_watch';
     EXECUTE 'DROP EVENT TRIGGER IF EXISTS issue_pg_cron_access';
     EXECUTE 'DROP EVENT TRIGGER IF EXISTS issue_pg_net_access';
   END \$\$;" >/dev/null

cat \
  "$ROOT/supabase/migrations/20261102_learning_evidence.sql" \
  "$ROOT/supabase/migrations/20261102_learning_evidence_v2.sql" \
  | docker exec -i "$PG" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q

docker exec "$PG" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q -c \
  "alter role authenticator with password 'postgres';
   grant anon, authenticated, service_role to authenticator;
   grant usage on schema public to anon, authenticated;
   insert into auth.users (id, email) values
     ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'learner.a@example.test'),
     ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'learner.b@example.test')
   on conflict (id) do nothing;"

echo "▶ Starting PostgREST"
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

echo "▶ Running evidence integration suite against PostgREST"
EVIDENCE_REST_URL="http://127.0.0.1:${REST_PORT}" \
EVIDENCE_REST_JWT_SECRET="$JWT_SECRET" \
npx vitest run -c "$ROOT/vitest.integration.config.js" "$ROOT/tests/integration/evidenceRls.integration.test.ts"

echo "✅ Evidence REST integration suite passed"
