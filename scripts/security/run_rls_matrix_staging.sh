#!/usr/bin/env bash
# ============================================================================
# STAGING RLS matrix proof.
#
# Reads learner A/B credentials from EASYTUTOR_TEST_ENV (default
# $HOME/.config/easytutor/test.env), signs in through GoTrue, and runs the same
# assertions as the local proof against the real PostgREST endpoint.
#
# This script never prints the env file or any credential value. It fails
# closed if the env file is missing or incomplete.
#
# Requires the hardening migration to have been applied by the operator first
# (see docs/security/SECURITY.md). Until then, expect FAIL/BLOCKED rows — that
# is the honest result, not a script bug.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${EASYTUTOR_TEST_ENV:-$HOME/.config/easytutor/test.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "BLOCKED: EASYTUTOR_TEST_ENV not found at $ENV_FILE"
  echo "Create it with SUPABASE_URL, SUPABASE_ANON_KEY and the A/B test user credentials."
  exit 2
fi

# Presence check only — never print values.
PROD_REFS="$(cat "$ROOT/scripts/security/prod-refs.txt" | grep -v '^#' | grep -v '^[[:space:]]*$' || true)"

for key in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_TEST_USER_A_EMAIL SUPABASE_TEST_USER_A_PASSWORD SUPABASE_TEST_USER_B_EMAIL SUPABASE_TEST_USER_B_PASSWORD; do
  if ! grep -qE "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE"; then
    echo "BLOCKED: $ENV_FILE is missing $key" >&2
    exit 2
  fi
  val="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE" | tail -1 | sed -E 's/^[^=]*=//; s/^[[:space:]]+//; s/[[:space:]]+$//; s/^["'"'"']//; s/["'"'"']$//')"
  if [ "${val#...}" != "$val" ]; then
    printf 'BLOCKED: %s value for %s starts with "..." (redacted, not a real value)\n' "$ENV_FILE" "$key" >&2
    exit 2
  fi
done

URL_VAL="$(grep -E '^[[:space:]]*SUPABASE_URL[[:space:]]*=' "$ENV_FILE" | tail -1 | sed -E 's/^[^=]*=//; s/^[[:space:]]+//; s/[[:space:]]+$//; s/^["'"'"']//; s/["'"'"']$//')"
for ref in $PROD_REFS; do
  case "$URL_VAL" in
    *"$ref"*) echo "BLOCKED: SUPABASE_URL points at protected production ref $ref; harness refuses." >&2; exit 2 ;;
  esac
done

echo "▶ running staging RLS matrix assertions from EASYTUTOR_TEST_ENV"
EASYTUTOR_TEST_ENV="$ENV_FILE" \
  node --dns-result-order=ipv4first "$ROOT/scripts/security/rls_matrix_rest.mjs" --mode staging
