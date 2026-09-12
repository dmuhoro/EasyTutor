# Evidence — Every hash cited, verified (2026-09-12)

The constitution forbids fabricated evidence: a doc must only cite hashes that actually
exist in this repo's object database. Every object named by hashes elsewhere in the
sprint/evidence layer was checked with `git rev-parse --verify <hash>^{commit}` this
session and resolved. Recorded here so the check is reproducible.

## Hashes cited by sprint docs + CHANGELOG + STATUS, all rev-parse-verified

| Short hash | Full / role |
|---|---|
| `f032732` | current release HEAD (`release/v1.0.0`) — green gate ran here |
| `0679030` | L1 live network proof (rollup, model slots) |
| `b3af91f` | L2 RAG wired into tutor chat |
| `22bcacc` | L3 split chat/embedding config |
| `44166f0` | URL repoint to `easytutor-ten.vercel.app` |
| `46c58bb` | gitignore local `.vercel` link metadata |

Each of these was verified present with `git rev-parse --verify <hash>^{commit}` (exit 0)
during this session before being cited; none is an invented value. The repository's
integrity rule — "no doc may cite a non-existent hash or path" — is the reason this
file exists as the resolvable endpoint for those citations.
