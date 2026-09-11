#!/bin/bash

echo "=== TYPECHECK ==="
npm run typecheck

echo ""
echo "=== RELIABILITY TESTS ==="
npx vitest run tests/reliability/aiReliability.test.ts

echo ""
echo "=== QA RUNNER ==="
node scripts/qa/qa_runner.js
