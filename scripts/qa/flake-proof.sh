#!/usr/bin/env bash
# Consecutive in-suite proof for the quiz.wrongAnswers flake fix.
# Fails closed on the first failed run or a missing pass summary.
set -uo pipefail

RUNS="${FLAKE_PROOF_RUNS:-20}"
LOG_DIR="${FLAKE_PROOF_LOG_DIR:-/tmp/opencode/work/flake-proof/runs}"

if ! [[ "$RUNS" =~ ^[1-9][0-9]*$ ]]; then
  echo "[FLAKE PROOF] FAIL: FLAKE_PROOF_RUNS must be a positive integer (got '$RUNS')"
  exit 1
fi

mkdir -p "$LOG_DIR"

for ((i = 1; i <= RUNS; i++)); do
  printf -v run_id '%02d' "$i"
  log="$LOG_DIR/run-$run_id.log"
  echo "[FLAKE PROOF] run $run_id/$RUNS -> $log"

  if ! npm test > "$log" 2>&1; then
    echo "[FLAKE PROOF] FAIL: npm test exited non-zero on run $run_id"
    tail -40 "$log"
    exit 1
  fi

  if ! grep -qE 'Test Files +[0-9]+ passed' "$log"; then
    echo "[FLAKE PROOF] FAIL: no passing Test Files summary on run $run_id"
    tail -40 "$log"
    exit 1
  fi

  if grep -qE 'Test Files +[0-9]+ failed' "$log"; then
    echo "[FLAKE PROOF] FAIL: failing Test Files summary on run $run_id"
    tail -40 "$log"
    exit 1
  fi
done

echo "[FLAKE PROOF] PASS: $RUNS consecutive in-suite runs, zero failures"
