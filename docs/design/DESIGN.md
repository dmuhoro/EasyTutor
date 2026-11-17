# EasyTutor Design — Phase 2

**Status:** Draft — awaiting approval (Step 0).  
**Source of truth:** `src/design/tokens.ts` · **Tailwind mirror:** `tailwind.config.js` · **Primitives:** `components/ui/`

## 1. Palette (dark mode first)

EasyTutor is dark-first. The base surface is a near-black `#0d0f12` so the app reads like a calm notebook, not a bright terminal. All colour decisions flow from `COLORS` in `src/design/tokens.ts`; no screen may hardcode a hex.

### Light / dark surface mapping

| Role | Dark (default) | Light | Usage |
|---|---|---|---|
| `surface.bg` | `#0d0f12` | `#fafafa` | App background |
| `surface.card` | `#161920` | `#ffffff` | Cards, sheets, modals |
| `surface.border` | `#2a2f3d` | `#e5e7eb` | Dividers, card borders |
| `surface.elevated` | `#1c2029` | `#f3f4f6` | Floating sheets, toast |
| `text.primary` | `#ffffff` | `#0f172a` | Headlines, primary labels |
| `text.secondary` | `#8a8fa3` | `#475569` | Subtitles, meta |
| `text.muted` | `#5a5f6d` | `#94a3b8` | Captions, placeholder |
| `brand.500` | `#4f7cff` | `#3b63cc` | Primary actions, links |
| `brand.900` | `#0f1f33` | `#dbeafe` | Active state on dark |

Contrast floor (WCAG 2.2 AA): body text ≥ 4.5:1 on any surface; brand/error/success on card ≥ 4.5:1; muted meta ≥ 3:1. Verified by `tests/design/tokens.test.ts`.

## 2. Type scale and font strategy

**Fonts:** Syne (display/headlines) and DM Sans (body/UI). Both loaded as a single variable-font subset via Google Fonts in the web build; native uses the bundled `.ttf` files already in `assets/fonts/`. System font fallback only if the subset fails to load — never a second web font.

| Scale | Size | Line height | Weight | Font | Use |
|---|---|---|---|---|---|
| `4xl` | 36px | 40px | 700 | Syne | Page hero headlines |
| `3xl` | 30px | 36px | 700 | Syne | Section titles |
| `2xl` | 24px | 32px | 700 | Syne | Card titles |
| `xl` | 20px | 28px | 500 | DM Sans | Prominent labels |
| `base` | 16px | 24px | 400/500 | DM Sans | Body copy |
| `sm` | 14px | 20px | 400/500 | DM Sans | Captions, meta |
| `xs` | 12px | 16px | 500 | DM Sans | Badges, timestamps |

Text scales to 200% without breakage: all containers use `max-width` constraints, never fixed heights for text-bearing elements.

## 3. Spacing (4/8 grid)

All layout spacing derives from `SPACING` (0–64px, steps of 4 then 8):

| Token | Value | Use |
|---|---|---|
| `none` | 0 | — |
| `xs` | 4px | Icon padding, tight grouping |
| `sm` | 8px | Element gaps, input inner padding |
| `md` | 12px | Card inner padding (tight) |
| `lg` | 16px | Standard card padding, section gaps |
| `xl` | 24px | Page outer padding, large gaps |
| `2xl` | 32px | Section vertical rhythm |
| `3xl` | 48px | Major section separation |
| `4xl` | 64px | Hero vertical padding |

Multiples of 4/8 only — no arbitrary values (e.g. `p-3`, `gap-7`).

## 4. Radii

| Token | Value | Use |
|---|---|---|
| `sm` | 8px | Small chips, tags |
| `md` | 12px | Buttons, inputs |
| `lg` | 16px | Cards |
| `xl` | 24px | Large cards, modal containers |
| `2xl` | 32px | Auth sheets, onboarding cards |
| `3xl` | 40px | Hero containers |
| `full` | 9999px | Avatars, circular progress |

## 5. Elevation

No drop shadows on dark surfaces (they muddy the palette). Elevation is expressed through surface layering and subtle borders:

| Level | Surface | Border | Use |
|---|---|---|---|
| Base | `surface.bg` | none | Page background |
| Card | `surface.card` | `surface.border` | Content containers |
| Elevated | `surface.elevated` | `surface.border` | Sheets, modals, toast |
| Overlay | `overlay` (80% black) | none | Backdrop behind modals |

Shadows (web only, light mode): `shadow-sm` (0 1px 2px) for cards; `shadow-md` (0 4px 6px) for modals. Disabled in dark mode.

## 6. Motion rules

Motion is decorative only — it must explain state changes, never decorate.

| Rule | Implementation |
|---|---|
| Reduced motion respected | `useReducedMotion()` collapses all durations to 0 |
| Page transitions | `fade-in` / `slide-up`, 200ms ease-out |
| Progress bars | `progress` keyframe, 1s ease-out |
| Subtle pulse | `pulse-subtle`, 2s, 1↔0.7 opacity (loading skeletons only) |
| No haptics on primary actions | Haptics reserved for errors and confirmations |
| Auto-play media | None — all media is user-initiated |

## 7. Icon set

**Ionicons** (already bundled via `@expo/vector-icons/Ionicons`) — single icon library across web and native. No SVG imports, no `react-native-svg` in eager paths. Icon names from the Ionicons set only.

| Role | Icon |
|---|---|
| Home | `home` |
| Learn / Tutor | `book` |
| Practice / Quiz | `flash` |
| Library / Roadmap | `reader` |
| Progress | `trending-up` |
| Profile | `person` |
| Settings | `settings` |
| Citation | `quote` |
| Offline | `cloud-offline` |
| Low data | `signal` |

## 8. Voice

Copy is calm, encouraging, and never guilt-tripping.

| Principle | Example |
|---|---|
| One clear next action per screen | "Pick a subject" not "You should pick a subject" |
| No guilt streaks | "You've studied 3 days" not "Don't break your streak" |
| No fake urgency | No countdown timers, no "limited time" badges |
| Honest states | Loading, empty, error, offline, low-data always shown |
| Africa-first examples | Local currencies, Kenyan/Nigerian/South African curriculum references |
| i18n-ready | EN complete; SW and FR flagged DRAFT — no hard-coded strings |

## 9. Component inventory (Phase 2 target)

| Component | Status | Notes |
|---|---|---|
| Button | Exists | `variant`, `size`, `loading`, `icon`, `fullWidth` |
| Input | Exists | Wrapped in `Card`-style surface |
| Card | Exists | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| BottomNav / SideRail | To build | Responsive: tabs <768px, rail ≥768px |
| Sheet | To build | Slide-up bottom sheet, overlay backdrop |
| Toast | Exists | `ToastProvider` + `useToast()` |
| Progress | Exists | `Meter` (eager-safe), `ProgressRing`/`LinearProgress` (lazy only) |
| Skeleton | Exists | RN `Animated` on native, static on web |
| EmptyState | Exists | Title, description, optional CTA |
| ErrorState | To build | Title, message, retry action |
| Badge | To build | Small pill, status colours |
| ChatBubble | To build | With citation chips |
| StageStepper | To build | Numbered steps for tutor flow |
| QuizOption | To build | Selectable answer cards with correct/wrong states |
| Timer | To build | Optional, only for mock exam mode |

## 10. Rules

1. Never hardcode a hex value in a screen — use a Tailwind token class or `COLORS`.
2. Do not import `react-native-svg`, Reanimated, or `ProgressRing` from eagerly-loaded screens.
3. Every interactive primitive must announce role/state, respect `disabled`/`loading`.
4. New route screens live in `screens/`; `app/**` stays a lazy wrapper.
5. Dark mode is the default; light mode is a class toggle on `<html>` / root view.
6. 44px+ touch targets on all interactive elements.
7. One clear next action per screen.
