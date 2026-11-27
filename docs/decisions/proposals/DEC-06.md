# DEC-06 — Repository licence (PROPOSAL · NOT RATIFIED)

**Status:** agent-prepared for Daniel · **NOT VERIFIED** · **no evidence file exists**
**Register row:** none yet — this is a new decision proposal, not a register promotion.

> This is a documentation-truth decision. The agent does not add a licence and
> does not create evidence for it. Until Daniel answers, the README claim is
> treated as unverified and is corrected in PR-I.

## Question

Does EasyTutor ship under a real licence, or does the README stop claiming MIT?

## Recommended default

**Assert no licence:** remove the MIT badge and the `LICENSE` link from
`README.md`. Add a real licence file only if Daniel supplies the text and the
copyright holder.

## Data

- `README.md:12` displays an `MIT license` badge linking to `LICENSE`.
- `git ls-files | grep -iE '(^|/)license'` returns **no tracked LICENSE file**.
- GitHub therefore reports no licence for the repository. A badge pointing at
  a missing file is a false claim, not a legal grant.

## Cost of delay

An absent-but-advertised licence leaves pilot users with no stated terms and
leaves the README false. The fix is one documentation line either way; the
decision is Daniel's because it has legal meaning.

## Paste-ready ratification block (Daniel)

```
DECISION DEC-06 — LICENCE
[ ] No licence: remove the MIT badge and LICENSE link from README.md
[ ] Add a licence: LICENSE text supplied by Daniel, holder = ________________
    and README badge verified against the committed file

Signed: ______________________   Date: ____________
```
