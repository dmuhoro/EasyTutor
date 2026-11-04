#!/usr/bin/env bash
# ============================================================================
# Reproducible RLS verification for learning evidence.
#
# Runs the real, committed migrations and the real policy assertions against
# the official Supabase Postgres image (auth schema, auth.uid(), anon /
# authenticated / service_role roles). No production database is touched.
#
# Requirements: docker
# Usage: ./scripts/security/run_evidence_rls_tests.sh
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER="${RLS_CONTAINER:-easytutor-rls-pg}"
PORT="${RLS_PORT:-55432}"
IMAGE="${RLS_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.159}"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "▶ Starting Supabase Postgres ($IMAGE) as $CONTAINER on :$PORT"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -p "${PORT}:5432" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
  echo "✖ Postgres did not become ready" >&2
  exit 1
fi

echo "▶ Applying migrations + running RLS assertions"
# PostgREST's dev-only DDL event triggers are irrelevant to policy behaviour and
# can trip on a bare Postgres image; disable them for the isolated harness.
docker exec "$CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -c \
  "drop event trigger if exists pgrst_ddl_watch; drop event trigger if exists pgrst_drop_watch;" >/dev/null

cat \
  "$ROOT/supabase/migrations/20261102_learning_evidence.sql" \
  "$ROOT/supabase/migrations/20261102_learning_evidence_v2.sql" \
  "$ROOT/supabase/tests/learning_evidence_rls_test.sql" \
  | docker exec -i "$CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1

echo "✅ Evidence RLS suite passed"
