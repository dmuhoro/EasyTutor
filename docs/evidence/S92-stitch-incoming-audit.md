# Sprint 92 — incoming Stitch export audit

**Date:** 2026-11-28 · **Base:** `main` `fccca43` · **Spec:**
`sprints/sprint_92_stitch_incoming_and_tutor_handoff.md`

All commands below were run against the local worktree
`~/workspace/projects/easytutor-ui` at `fccca43`. The incoming directory is
excluded from Git via `.git/info/exclude`; nothing in it was copied into the
repository, and no screenshot claim is made from its PNG files.

## 1. Inventory

`find docs/design/stitch-incoming -mindepth 1 -maxdepth 1 -type d | wc -l` → **37**.

- **35** folders contain `code.html` + `screen.png`.
- **2** folders contain only `DESIGN.md`: `ink_scholar_dark/` and
  `warm_editorial_scholar/`.

## 2. Screen exports are not new

Each incoming `code.html` was hashed with SHA-256 and compared with the 35
tracked exports in `docs/design/stitch/`:

| Result | Count |
|---|---|
| Byte-identical to a tracked export | 28 |
| Whitespace-only difference from a tracked export | 7 |
| Semantic design difference | **0** |

The seven whitespace-only exports are `easytutor_desktop_tutor_session_friction`,
`easytutor_learn`, `easytutor_library_importing_state`,
`easytutor_onboarding_step_3_what_are_you_studying`,
`easytutor_onboarding_step_4_pick_your_track`,
`easytutor_onboarding_step_6_daily_study_time` and
`easytutor_practice_quiz_result_working`. Stripping all whitespace from both
files yields the same SHA-256 for each pair.

Renamed exports that are byte-identical to a different tracked folder include
`easytutor_tvet_learning_platform` → tracked `today/`, and `easytutor_today_1` /
`easytutor_today_2` → tracked `today/` / `today-dark-mode/`. A new folder name is
therefore **not** evidence of a new screen.

**Conclusion:** the 35 incoming screens carry no new appearance to integrate.
They are the same designs already indexed in `docs/design/stitch/README.md` and
already rebuilt with NativeWind components in Sprint 21.

## 3. The two genuinely new files are theme specifications

`warm_editorial_scholar/DESIGN.md` specifies `primary #00614f`,
`background #fcf9f3`, `on-surface #1c1c18`, `secondary #835400`, DM Sans + JetBrains
Mono and 8 px rhythm. Those are the runtime values already exported by
`src/design/tokens.ts` (`COLORS.primary.DEFAULT`, `COLORS.background.DEFAULT`,
`COLORS.text.primary`, `COLORS.warning.DEFAULT`) and recorded in
`docs/design/stitch/design-tokens.json`.

`ink_scholar_dark/DESIGN.md` specifies `primary #4edea3`, `background #101414`,
`on-surface #e0e3e2`, `secondary #ffb95f`. Those are already exported by
`COLORS_DARK.brand[300]`, `COLORS_DARK.surface.bg`, `COLORS_DARK.text.primary` and
`COLORS_DARK.warning.DEFAULT`.

Both theme documents also describe a light/dark typography and spacing system
already present in `tailwind.config.js` (`font-dmsans`, `font-jetbrains`, 4/8/16/24/32
spacing) and `src/design/tokens.ts` (`getColor(group, shade, scheme)`).

**Conclusion:** the new appearance is token-complete in the runtime. The honest
integration action is to keep the tokens as the single source of truth and fix
functional handoffs, not to copy downloaded HTML into the app.

## 4. Not claimed

- No Stitch MCP call was made; the key remains invalid (`401`) and rotation is
  owner-only (`D01`).
- No screenshot, pixel-diff or visual-regression pass is claimed from the 37
  PNG files in this session.
- No readiness row was promoted, no gate file was created, and no test, cap,
  budget or threshold was changed by this audit.
