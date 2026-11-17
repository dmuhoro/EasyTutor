# EasyTutor Design — Stitch baseline

**Status:** Approved — Stitch baseline (2026-11-17). Replaces the Phase 2 draft palette.
**Source of truth:** `src/design/tokens.ts` · **Tailwind mirror:** `tailwind.config.js` ·
**Primitives:** `components/ui/` · **Reference screens:** `docs/design/stitch/`

The visual reference is a 35-screen Stitch project (`EasyTutor AI Study Companion`,
`8672350964718206202`). Screens are rebuilt in React Native against these tokens; the Stitch
HTML export is never shipped.

## 1. Palette (light-first, ink variant)

Light is the default scheme; the ink (dark) palette is the second value in each row. All
values are extracted from the Stitch design system (`docs/design/stitch/design-tokens.json`),
not invented. No screen may hardcode a hex (rule 1).

| Role | Light | Dark | Usage |
|---|---|---|---|
| `surface.bg` | `#fcf9f3` | `#101414` | App background (warm paper / ink) |
| `surface.card` | `#ffffff` | `#1c2020` | Cards, sheets |
| `surface.elevated` | `#f0eee8` | `#272b2b` | Sheets, toast, raised chrome |
| `surface.border` | `#bdc9c4` | `#3c4a42` | 1px soft borders, dividers |
| `text.primary` | `#1c1c18` | `#e0e3e2` | Headlines, labels |
| `text.secondary` | `#3e4945` | `#bbcabf` | Supporting copy |
| `text.muted` | `#6e7a75` | `#86948a` | Meta, captions |
| `primary.DEFAULT` | `#00614f` | `#4edea3` | Primary action fill, active tab |
| `primary.light` | `#0e7c66` | `#7bd7bd` | Hover/pressed, decorative |
| `warning` | `#835400` | `#ffb95f` | Advisory text (amber fill `#f2a93b`) |
| `error` | `#ba1a1a` | `#ffb4ab` | Errors, wrong answers |
| `success` | `#00614f` | `#4edea3` | Correct feedback — the design uses primary teal |

Contrast floor (WCAG 2.2 AA): body text ≥ 4.5:1 on every surface; muted meta ≥ 3:1. Enforced
by `tests/design/tokens.test.ts` for **both** schemes. One documented exception: small text on
the amber fill (`#6e4600` on `#f2a93b`) is 4.14:1 — amber carries fills and icons, never small
labels; labels on amber use ink `#1c1c18`.

## 2. Type scale and fonts

**DM Sans only** (400 / 500 / 600 / 700), loaded through `@expo-google-fonts/dm-sans`.
`font-syne` remains as a legacy class alias for DM Sans Bold — it is not a second typeface.
Formulas and code use the platform monospace stack until JetBrains Mono is bundled.

| Scale | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `4xl` | 36px | 40px | 700 | Hero headlines |
| `3xl` | 30px | 36px | 700 | Section titles |
| `2xl` | 24px | 32px | 600–700 | Card titles |
| `xl` | 20px | 28px | 500 | Prominent labels |
| `base` | 16px | 24px | 400/500 | Body copy |
| `sm` | 14px | 20px | 400/500 | Captions, meta |
| `xs` | 12px | 16px | 500 | Badges, timestamps |

Text scales to 200% without breakage: containers use `max-width`, never fixed heights.

## 3. Spacing (4/8 grid)

`SPACING` — 0, 4, 8, 12, 16, 24, 32, 48, 64. Only these steps; no arbitrary values.

## 4. Radii

| Token | Value | Use |
|---|---|---|
| `sm` | 8px | Chips, tags |
| `md` | 12px | Buttons, inputs |
| `lg` | 16px | Cards |
| `xl` | 24px | Large cards, sheets |
| `2xl` | 32px | Auth and onboarding cards |
| `full` | 9999px | Avatars, rings |

## 5. Elevation

Flat by default. Depth comes from surface layering and a 1px border, not drop shadows:

| Level | Surface | Border | Use |
|---|---|---|---|
| Base | `surface.bg` | none | Page |
| Card | `surface.card` | `surface.border` | Content |
| Elevated | `surface.elevated` | `surface.border` | Sheets, toast |

Shadows are web-only and light-mode-only: `shadow-sm` for cards, `shadow-md` for modals.

## 6. Motion

Decorative only — motion explains state, never decorates.

| Rule | Implementation |
|---|---|
| Reduced motion respected | durations collapse to 0 |
| Page transitions | `fade-in` / `slide-up`, 200ms ease-out |
| Progress bars | `progress` keyframe, 1s ease-out |
| Loading pulse | `pulse-subtle`, 2s, 1↔0.7 opacity, skeletons only |

## 7. Icon set

Ionicons only (bundled), outline style, no emoji.

| Role | Icon |
|---|---|
| Home | `home` |
| Learn / Tutor | `book` |
| Practice | `flash` |
| Library | `reader` |
| You | `person` |
| Citation | `quote` |
| Offline | `cloud-offline` |
| Low data | `signal` |

The tab set is **five**: Home · Learn · Practice · Library · You (Progress and Profile merge
into "You"). Five is the practical phone limit and the Stitch baseline.

## 8. Voice

Calm, encouraging, never guilt-tripping.

| Principle | Example |
|---|---|
| One clear next action | "Pick a subject" |
| No guilt streaks | "You've studied 3 days" |
| No fake urgency | no countdowns, no "limited time" |
| Honest states | loading, empty, error, offline, low-data always shown |
| Africa-first examples | local currencies, KE/NG/ZA curriculum references |
| i18n-ready | EN complete; SW and FR flagged DRAFT |

## 9. Component inventory

| Component | Status | Notes |
|---|---|---|
| Button | Exists | `variant`, `size`, `loading`, `icon`, `fullWidth` |
| Input | Exists | token-driven, label + error |
| Card | Exists | `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter` |
| Badge | Exists | 5 variants + outline |
| Chip | Exists | pill chips for filters and selections |
| Sheet | Exists | bottom sheet (`components/Sheet.tsx`) |
| Toast | Exists | `ToastProvider` + `useToast()` |
| Meter / ProgressRing | Exists | progress ring and linear meter |
| Skeleton | Exists | `Animated` on native, static on web |
| EmptyState | Exists | title, description, optional CTA |
| ChatBubble | Exists | message bubbles for the tutor |
| StageStepper | Exists | 4-step tutor stages |
| QuizOption | Exists | selectable answer cards |
| Timer | Exists | mock-exam countdown |
| SideRail | To build | desktop ≥ 1024px navigation |
| CitationSheet | To build | source sheet with "from your private notes" |

## 10. Rules

1. Never hardcode a hex in a screen — use a token class or `COLORS`.
2. Do not import `react-native-svg`, Reanimated, or `ProgressRing` from eagerly-loaded screens.
3. Every interactive primitive announces role/state and respects `disabled`/`loading`.
4. New route screens live in `screens/`; `app/**` stays a lazy wrapper.
5. Light is the default scheme; dark is selected explicitly. A screen only claims dark support
   when its dark variant is implemented and reviewed.
6. Tap targets are at least **48px** on the smallest side.
7. One clear next action per screen.
