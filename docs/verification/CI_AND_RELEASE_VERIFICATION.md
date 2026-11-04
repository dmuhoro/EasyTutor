# CI and Release Verification

CI updated: .github/workflows/ci.yml Node 22.13, npm ci, typecheck, lint, test, boundary audit, QA runner, web export. Node 18 replaced. Local results: typecheck 0 errors; vitest 44/199; boundary 0; QA green. Branch push workflow: commit on feature branch, open PR, merge after CI green. No production deployment.