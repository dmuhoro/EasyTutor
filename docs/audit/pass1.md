# Pass 1 – Inventory + git

## Branches
  agents/codebase-indexing
  feature/acceptance-gap-closure
* feature/mathematics-end-to-end-sprint
  main
  release/v1.0.0
  status
  remotes/origin/HEAD -> origin/main
  remotes/origin/agents/codebase-indexing
  remotes/origin/feature/acceptance-gap-closure
  remotes/origin/feature/mathematics-end-to-end-sprint
  remotes/origin/main
  remotes/origin/master
  remotes/origin/merge/stashmind-integration
  remotes/origin/release/v1.0.0
  remotes/origin/status

## Tags
pre-purge-2026-11-02
v1-learning-intelligence
v1.0.1

## Unpushed commits (vs origin/main)
76ada8e test: silence analytics/telemetry console noise unless DEBUG=1
40fbb4a feat(ai): default local chat model qwen2.5:1.5b
3bfd5c8 docs: add rule to never print .env* contents
ac06450 chore: commit evidence security harness and integration config
0a6fd6e feat(domain): add canonical learner-state projection and integrate math store
4752934 test: use uuid learner id in mathJourneyStore fixture
439a234 feat(evidence): concrete Supabase writer/repository + append-only migration v2
3dbe52c docs(product): evidence layer report, tracker, changelog
bb78778 feat(evidence): additive learning_evidence migration + validated idempotent outbox + store sync
3d6e775 docs(product): math vertical slice report + changelog
04e8a2b feat(math): real diagnostic bank + deterministic scoring; remove synthetic journey signals
82f6351 docs(sprint): math journey integration record + changelog
3ebc4cd feat(math): persisted journey store + math journey screen wired from explore
a3cc52f docs(product): master completion baseline
4e4d75c feat(math-sprint): journey orchestration domain + test
c316dce docs(recovery): archive and rebuild readiness report
3d20647 feat(math-sprint): reusable skill graph + sprint report
78dc491 chore: CI node22 + acceptance verification docs

## Top-level folders
ai-context/ tracked=2 untracked=0 size=20K files=2 loc=0 lastmod=2026-09-12 23:44:37 +0300
app/ tracked=39 untracked=0 size=416K files=39 loc=7125 lastmod=2026-11-02 16:59:09 +0300
archive/ tracked=957 untracked=0 size=20M files=996 loc=25718 lastmod=2026-09-12 15:02:32 +0300
assets/ tracked=7 untracked=0 size=1.6M files=7 loc=0 lastmod=2026-09-15 14:36:08 +0300
components/ tracked=18 untracked=0 size=124K files=18 loc=2100 lastmod=2026-09-12 14:28:44 +0300
constants/ tracked=2 untracked=0 size=32K files=2 loc=196 lastmod=2026-05-11 07:40:16 +0300
data/ tracked=4 untracked=0 size=28K files=4 loc=636 lastmod=2026-05-11 07:40:16 +0300
dist/ tracked=0 untracked=0 size=11M files=68 loc=1841 lastmod=
docs/ tracked=73 untracked=1 size=620K files=74 loc=0 lastmod=2026-11-02 20:33:59 +0300
hooks/ tracked=2 untracked=0 size=16K files=2 loc=340 lastmod=2026-09-11 21:07:17 +0300
lib/ tracked=59 untracked=0 size=468K files=59 loc=8873 lastmod=2026-11-02 23:46:43 +0300
node_modules/ tracked=0 untracked=0 size=652M files=49906 loc=3805142 lastmod=
scripts/ tracked=9 untracked=0 size=64K files=9 loc=269 lastmod=2026-11-02 23:43:55 +0300
services/ tracked=2 untracked=0 size=16K files=2 loc=267 lastmod=2026-09-11 22:13:02 +0300
sprints/ tracked=8 untracked=0 size=48K files=8 loc=0 lastmod=2026-11-02 16:43:02 +0300
src/ tracked=91 untracked=0 size=584K files=91 loc=7517 lastmod=2026-11-02 22:05:50 +0300
store/ tracked=7 untracked=0 size=68K files=7 loc=1237 lastmod=2026-11-02 22:05:50 +0300
supabase/ tracked=45 untracked=0 size=336K files=46 loc=0 lastmod=2026-11-02 23:43:55 +0300
tests/ tracked=61 untracked=1 size=380K files=61 loc=5345 lastmod=2026-11-02 23:48:05 +0300
types/ tracked=2 untracked=0 size=12K files=2 loc=70 lastmod=2026-05-19 22:57:59 +0300

## Large tracked files (>200KB)
-rw-rw-r-- 1 daniel-muhoro daniel-muhoro  249250 May 11 07:59 archive/audits/dependency-graph.svg
-rw-rw-r-- 1 daniel-muhoro daniel-muhoro  257730 May 11 14:15 archive/dependency-cruiser.svg
-rw-rw-r-- 1 daniel-muhoro daniel-muhoro 3294694 May 11 07:58 archive/dependency-graph.png
-rw-rw-r-- 1 daniel-muhoro daniel-muhoro  612703 May 25 19:42 archive/diagnostics/appstate_usage.txt
-rw-rw-r-- 1 daniel-muhoro daniel-muhoro 7620424 May 25 19:41 archive/diagnostics/asyncstorage_usage.txt
-rw-rw-r-- 1 daniel-muhoro daniel-muhoro  235594 May 25 19:38 archive/diagnostics/sprint1_day2_state.txt
-rw-rw-r-- 1 daniel-muhoro daniel-muhoro 1350339 Sep 15 18:21 assets/auth_background.png
-rwxrwxr-x 1 daniel-muhoro daniel-muhoro  205590 Sep 15 18:21 docs/evidence/img/2026-09-13-device-proof-phone-a-rail-reached-133308.jpg
-rw-rw-r-- 1 daniel-muhoro daniel-muhoro  539555 Sep 15 18:21 package-lock.json

## archive/
archive
archive/agents
archive/ai-context
archive/audits
archive/.claude
archive/.claude/agents
archive/.claude/commands
archive/.claude-flow
archive/.claude-flow/data
archive/.claude-flow/logs
archive/.claude-flow/metrics
archive/.claude-flow/security
archive/.claude-flow/sessions
archive/.claude/helpers
archive/.claude/skills
archive/components
archive/components/ui
archive/decisions
archive/diagnostics
archive/docker
archive/founder-os
archive/founder-os/daily-logs
archive/founder-os/decisions
archive/founder-os/metrics
archive/founder-os/operations
archive/founder-os/products
archive/founder-os/strategy
archive/founder-os/vision
archive/founder-os/weekly
archive/founder-os/weekly-reviews
archive/future-os
archive/future-os/innovation
archive/future-os/maintenance
archive/future-os/technical-debt
archive/future-os/user-feedback
archive/future-os/version-roadmap
archive/lib
archive/lib/analytics
archive/lib/bridge
archive/lib/cache
archive/lib/commerce
archive/lib/db
archive/lib/diagnostics
archive/lib/ingestion
archive/lib/intelligence
archive/lib/sync
archive/memory
archive/observability
archive/observability/errors
archive/observability/tracing
archive/ops-logs
archive/prompts
archive/release
archive/reports
archive/reports/session-logs
archive/reports/system-analysis
archive/runtime-workers
archive/scripts
archive/scripts/analytics
archive/scripts/ingestion
archive/specs
archive/specs/backlog
archive/specs/completed
archive/specs/in-progress
archive/src
archive/src/agents
archive/src/ai-os
archive/src/api
archive/src/billing
archive/src/business
archive/src/commercial
archive/src/growth
archive/src/infrastructure
archive/src/knowledge
archive/src/market
archive/src/maturity
archive/src/observability
archive/src/productization
archive/src/products
archive/src/reliability
archive/src/runtime
archive/src/sdk
archive/src/services
archive/src/stabilization
archive/src/ux
archive/store
archive/strategy
archive/.swarm
archive/templates
archive/templates/audits
archive/templates/releases
archive/templates/specs
archive/templates/sprints
archive/tests
archive/tests/agents
archive/tests/business
archive/tests/commerce
archive/tests/deployment
archive/tests/e2e
archive/tests/flows
archive/tests/growth
archive/tests/ingestion
archive/tests/knowledge
archive/tests/market
archive/tests/maturity
archive/tests/operational
archive/tests/platform
archive/tests/productization
archive/tests/reliability
archive/tests/stabilization
archive/tests/stress
archive/.warp-drive
archive/.warp-drive/agents
archive/.warp-drive/mcp
archive/.warp-drive/memory
archive/.warp-drive/prompts
archive/.warp-drive/rules
archive/.warp-drive/workflows
