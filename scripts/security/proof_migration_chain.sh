#!/usr/bin/env bash
# Local-only proof: apply the committed schema + migrations in order to a
# throwaway Supabase Postgres container. Never targets a remote database.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
C="${PROOF_CONTAINER:-easytutor-migration-proof}"
PORT="${PROOF_PORT:-55440}"
IMAGE="${PROOF_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.159}"

cleanup(){ docker rm -f "$C" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker rm -f "$C" >/dev/null 2>&1 || true
docker run -d --name "$C" -p "${PORT}:5432" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
for _ in $(seq 1 60); do docker exec "$C" pg_isready -U supabase_admin >/dev/null 2>&1 && break; sleep 1; done
docker exec "$C" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q -c \
  "drop event trigger if exists pgrst_ddl_watch; drop event trigger if exists pgrst_drop_watch; drop event trigger if exists pgrst_drop_watch;"

apply(){
  local label="$1" file="$2"
  local out
  out=$(docker exec -i "$C" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q -f - < "$file" 2>&1)
  local rc=$?
  if [ $rc -eq 0 ]; then echo "PASS $label"; else
    echo "FAIL $label"
    printf '%s\n' "$out" | sed -n '1,6p'
  fi
  return $rc
}

FAILED=0
apply "schema.sql" "$ROOT/supabase/schema.sql" || FAILED=1
for f in "$ROOT"/supabase/migrations/*.sql; do
  b="$(basename "$f")"
  [ "$b" = "run-all.sql" ] && continue
  apply "$b" "$f" || FAILED=1
done
apply "run-all.sql" "$ROOT/supabase/migrations/run-all.sql" || FAILED=1
echo "FAILED_COUNT=$FAILED"
