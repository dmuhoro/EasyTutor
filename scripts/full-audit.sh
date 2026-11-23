#!/usr/bin/env bash
# Full system audit.
#
# Verification steps FAIL CLOSED: any non-zero exit makes the whole audit exit
# non-zero. Diagnostics (git status, outdated packages, npm audit) are recorded
# verbatim but never decide the result — they legitimately report findings on
# a healthy tree. All commands are declared npm scripts or declared project
# tools; the undeclared `madge` calls were removed in favour of the declared
# `lint:cycles` gate used by CI, and the unavailable `expo-doctor` diagnostic
# was removed rather than invoking an undeclared binary.
#
# We deliberately do NOT use `set -e`: every step must run so the report is
# complete, and the aggregated failure count is returned at the end.

set -uo pipefail

mkdir -p audits

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT="audits/full-audit-$TIMESTAMP.txt"
FAILURES=0

section() {
  echo -e "\n\n## $1 ##\n"
}

verify() {
  local label="$1"
  shift
  section "$label"
  if "$@"; then
    echo "VERIFICATION PASS: $label"
  else
    local code=$?
    echo "VERIFICATION FAIL: $label (exit $code)"
    FAILURES=$((FAILURES + 1))
  fi
}

inform() {
  local label="$1"
  shift
  section "$label (informational)"
  if "$@"; then
    echo "INFORMATIONAL PASS: $label (exit 0)"
  else
    local code=$?
    echo "INFORMATIONAL: $label exited $code — recorded, does not gate this audit"
  fi
}

{
  echo "==================================="
  echo "EASYTUTOR FULL SYSTEM AUDIT"
  echo "Generated: $(date)"
  echo "==================================="

  inform "GIT STATUS" git status

  verify "TYPESCRIPT CHECK" npm run typecheck
  verify "ESLINT" npm run lint
  verify "TESTS" npm test
  verify "CIRCULAR DEPENDENCIES" npm run lint:cycles
  verify "ARCHITECTURE BOUNDARIES" node scripts/architecture/validate_boundaries.js
  verify "AI BOUNDARY" npm run check:ai-boundary
  verify "SECRET GUARDS" npm run guard:secrets

  inform "OUTDATED PACKAGES" npm outdated
  inform "SECURITY AUDIT" npm audit

  echo "==================================="
  if [ "$FAILURES" -gt 0 ]; then
    echo "AUDIT FAILED — $FAILURES verification step(s) failed (see VERIFICATION FAIL above)"
  else
    echo "AUDIT COMPLETE — all verification steps passed"
  fi
  echo "==================================="
} > "$OUTPUT" 2>&1

echo "Audit saved to: $OUTPUT"

if [ "$FAILURES" -gt 0 ]; then
  echo "FAILED: $FAILURES verification step(s) failed — see $OUTPUT" >&2
  exit 1
fi

echo "All verification steps passed."
