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

  # GitHub Actions can force colour even when stdout is redirected. Vitest then
  # puts SGR escapes between the words of its summary, so the unchanged patterns
  # below would reject a genuinely passing run. Normalise only terminal escapes
  # into a scratch copy; the matchers and their meaning stay byte-identical and
  # are still applied to the complete visible summary.
  visible="$LOG_DIR/.visible-$run_id.log"
  sed -E $'s/\x1B\[[0-9;]*[[:alpha:]]//g' "$log" > "$visible"

  if ! grep -qE 'Test Files +[0-9]+ passed' "$visible"; then
    echo "[FLAKE PROOF] FAIL: no passing Test Files summary on run $run_id"
    tail -40 "$log"
    exit 1
  fi

  if grep -qE 'Test Files +[0-9]+ failed' "$visible"; then
    echo "[FLAKE PROOF] FAIL: failing Test Files summary on run $run_id"
    tail -40 "$log"
    exit 1
  fi
  rm -f "$visible"
done

echo "[FLAKE PROOF] PASS: $RUNS consecutive in-suite runs, zero failures"
