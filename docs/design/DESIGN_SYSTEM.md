# EasyTutor Design System

**Source of truth:** `src/design/tokens.ts`
**Tailwind mirror:** `tailwind.config.js` (`content` covers `app/`, `screens/`,
`components/`, `src/`)
**Primitives:** `components/ui/`

---

## Tokens

| Group | Tokens |
|---|---|
| Colour | `COLORS.brand[50..900]`, `primary`, `surface` (bg/card/border/elevated), `text` (primary/secondary/muted/inverse), `success`, `warning`, `error`, `accent`, `overlay` |
| Spacing | `SPACING.none/xs/sm/md/lg/xl/2xl/3xl/4xl` (0–64) |
| Radius | `RADIUS.sm/md/lg/xl/2xl/3xl/full` |
| Type | `FONT_FAMILY` (Syne display, DM Sans body, System fallback), `FONT_SIZE`, `LINE_HEIGHT`, `FONT_WEIGHT` |
| Motion | `DURATION.fast/base/slow` |
| Layering | `Z_INDEX.overlay/toast/modal` |

`lib/theme.ts` re-exports `COLORS`/`SPACING` from the tokens module (identity
asserted in `tests/design/tokens.test.ts`), so navigation theming and JS icon
colours cannot drift from the canonical values.

Contrast is tested, not assumed: body text pairs are ≥ 4.5:1, brand/error/
success on cards are ≥ 4.5:1, muted meta text is ≥ 3:1.

## Primitives

| Component | Purpose | Notes |
|---|---|---|
| `Button` | Primary action | `variant` primary/secondary/ghost/danger/inverse; `size` sm/md/lg; `loading`, `icon`, `iconPosition`, `fullWidth`; disabled state is announced. |
| `Card` | Surface container | Optional `interactive`/`onPress`; variants default/error/highlight/success. |
| `Chip` | Status/label pill | Variants neutral/brand/success/warning/danger; optional icon, selection and press handler. |
| `Meter` | View-only progress bar | Eager-safe: no SVG or Reanimated. Use on first-paint screens. |
| `ProgressRing` / `LinearProgress` | Animated progress | Uses `react-native-svg` + Reanimated, therefore **lazy routes only**. |
| `Skeleton` | Shimmer placeholder | RN `Animated` on native, static on web; font-free. |
| `Toast` | Non-blocking feedback | `ToastProvider` + `useToast()`; max 3 visible, auto-dismiss, tap to dismiss. Mounted in the root layout. |

## Reskins in this slice

- **Auth** (`app/(auth)/login.tsx`): token colours, `Button` for primary and
  Google actions, `Chip` segmented sign-in/sign-up control, `Toast` for
  validation/auth feedback (no blocking `Alert`), and a real submit lock so
  double taps cannot fire two auth requests.
- **Home** (`components/CommandCenter.tsx`): `Card` stats and sector rows,
  `Chip` mission counts and progress badge, `Meter` progress, `Button` CTA,
  plus an explicit empty state. Dropped `BlurView`, `react-native-svg` and
  Reanimated from the eager path.

## Rules

1. Never hardcode a hex value in a screen; use a Tailwind token class or
   `COLORS`.
2. Do not import `react-native-svg`, Reanimated, or `ProgressRing` from an
   eagerly-loaded screen (`app/index.tsx`, login, onboarding, layouts).
3. Every interactive primitive must announce role/state, and respect
   `disabled`/`loading`.
4. New route screens live in `screens/`; `app/**` stays a lazy wrapper.
