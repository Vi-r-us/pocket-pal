# PocketPal — DESIGN.md

A design specification for **PocketPal**, a personal finance app. This document describes the desired look, feel, and motion so generated screens feel like one coherent, modern, trustworthy product.

Source of truth in code: `frontend/src/index.css` (oklch tokens) and `frontend/DESIGN_LANGUAGE.md`. Hex values below are approximate sRGB conversions of those oklch tokens for portability.

---

## 1. Brand & personality

- **Product:** PocketPal — a calm, trustworthy personal finance dashboard (accounts, transactions, budgets, savings).
- **Voice:** clear, reassuring, data-first. Never flashy. The user's money is the hero; the UI gets out of the way.
- **Personality keywords:** calm, precise, premium, glassy, green.
- **Core principles:**
  1. **Clarity over decoration** — one hero metric per screen; everything else is visibly subordinate.
  2. **Trust through consistency** — the same action looks and behaves the same everywhere.
  3. **Accessibility is mandatory** — WCAG 2.1 AA contrast, full keyboard support, visible focus, reduced-motion support.
  4. **Motion is functional** — every animation gives feedback, guides attention, or shows a state change.

---

## 2. Color

Calm green primary with a glassmorphism layer. Dark mode is first-class (not an afterthought). Always use semantic roles, never raw colors in components.

### Light theme

| Role | Hex (approx) | Use |
| --- | --- | --- |
| `background` | `#F4F3EC` | Warm off-white page base |
| `foreground` | `#21302A` | Default text (deep green-charcoal) |
| `card` / `popover` | `#FFFFFF` | Opaque surfaces (tables, forms, menus) |
| `primary` | `#33473E` | Primary actions, key emphasis (deep green) |
| `primary-foreground` | `#FFFFFF` | Text on primary |
| `secondary` / `muted` | `#EFF3EE` | Quiet fills, supporting zones |
| `muted-foreground` | `#8C8A7E` | Supporting / secondary text |
| `accent` | `#74C79A` | Highlights, active nav (mint) |
| `destructive` | `#D96A5C` | Errors, destructive actions only |
| `border` / `input` | `#E3E8E1` | Hairlines, field borders |
| `ring` | `#5E8E72` | Focus ring |

### Dark theme

| Role | Hex (approx) | Use |
| --- | --- | --- |
| `background` | `#16201B` | Very dark green base |
| `foreground` | `#EEF2F0` | Default text (near white) |
| `card` / `popover` | `#26302A` | Opaque surfaces |
| `primary` | `#74C79A` | Primary actions (mint) |
| `primary-foreground` | `#1A241F` | Text on primary |
| `secondary` | `#3A4640` | Quiet fills |
| `muted` | `#2A332E` | Quiet zones |
| `muted-foreground` | `#9AA39C` | Supporting text |
| `accent` | `#4E8C6A` | Highlights, active nav |
| `destructive` | `#D85248` | Errors only |
| `border` / `input` | `#3C463F` | Hairlines, field borders |

### Finance intent colors (both themes)

Color by **meaning**, not decoration. Do **not** paint every metric icon green.

| Role | Hex (approx) | Meaning |
| --- | --- | --- |
| `trend-positive` / `income` | `#2FAE6A` | Gains, income, upward trend |
| `trend-negative` / `expense` | `#E5503F` | Losses, expenses, downward trend |
| `savings` / `transfer` | `#4F86D6` | Savings, transfers (blue) |
| `status-active` | `#2FAE6A` | Active / on |
| `warning` (chart amber) | `#E0A93B` | Caution / attention |

Use tinted fills via 10% opacity of the intent color (e.g. income pill = green text on a 10% green fill).

### Color rules

- **Red is reserved** for errors, validation failures, and destructive actions — not for neutral expense figures.
- **Green is the brand and the "positive" color.** Balance/neutral metrics use primary or neutral, not green.
- **Neutral backgrounds let data breathe** — avoid high-saturation fills on primary screens.
- All body and supporting text must meet **WCAG AA** (4.5:1 normal, 3:1 large/UI), including over glass surfaces.

---

## 3. Typography

- **Primary family:** `DM Sans` (sans-serif). Optional numeric/display face: `Geist`.
- **Scale (1.25 major-third ratio):**

| Step | Size | Use |
| --- | --- | --- |
| Display | 48px | Marketing/hero only |
| H1 | 30–36px | Page title |
| H2 | 20–24px | Section / panel title |
| H3 | 18px | Card title |
| Body | 16px | Default |
| Body-sm | 14px | Dense UI, table cells |
| Caption | 12px | Metadata, footers |

- **Weights:** 400 regular, 500 medium (labels/nav), 600 semibold (titles, KPI values), 700 sparingly.
- **Line-height:** ~1.2 headings/numbers, ~1.45 UI, ~1.7 long copy.
- **Numbers use tabular figures (`tabular-nums`)** — every monetary value, percentage, and count, so columns and KPIs align and don't jitter on update.
- **Hierarchy:** exactly one clear hero metric per screen; everything else is smaller and muted.

---

## 4. Spacing, layout & shape

- **Grid:** 4px base, 8px rhythm. Use steps of 4/8/16/24/32.
- **Page layout:** 12-column responsive grid inside a centered content frame with responsive horizontal padding and a single max width.
- **Radius:** generous and rounded — base radius **20px** (`--radius: 1.25rem`). Cards and buttons `~16–20px`, inputs `~12px`, pills fully rounded. Keep radii consistent within a surface family.
- **Shadows:** soft, low-opacity, green-tinted; elevation communicates layering (resting < raised < overlay). Don't invent ad-hoc shadows.

---

## 5. Surfaces — glass vs. flat

Decide a surface's material by its **density**, not by the screen.

- **Glass / Liquid Glass** (translucent blur + subtle specular rim) for **chrome and floating surfaces**: app sidebar, sticky header, mobile bottom nav, KPI/stat cards, modals, sheets, popovers, and auth hero surfaces.
- **Opaque `card`** for **dense, text-heavy surfaces**: data tables, forms, settings panels — anywhere legibility over a busy background matters. Glass never sits directly behind body text or data.
- A soft **radial green tint** sits on the page background as ambient backdrop; surfaces float above it.
- **Liquid Glass material:** light-aware specular rim + layered translucent fill + soft shadow; `backdrop-filter: blur(~18–22px) saturate(~160–180%)`. Keep saturation modest on large full-width chrome (e.g. the header) so it doesn't over-tint content behind it.
- **Accessibility fallbacks:** under `prefers-reduced-transparency` or `prefers-contrast`, glass drops to a near-opaque fill. Never rely on translucency for legibility.

---

## 6. Iconography

- **Library:** Lucide (single set, don't mix).
- **Sizes:** 16px inline/in buttons, 20px nav/standalone.
- Decorative icons are `aria-hidden`; icon-only controls get an `aria-label` (and a tooltip when meaning isn't obvious).
- Icon color follows the same intent tokens as text.

---

## 7. Motion

- **Every animation has a job:** feedback, attention, state change, or spatial relationship. Otherwise remove it.
- **Durations:** fast `120ms` (hover/focus/press/toggle), standard `220ms` (dropdown/tooltip/popover), slow `400ms` (modal/sheet/page transition). **Nothing exceeds 500ms.**
- **Easing:** enter `cubic-bezier(0,0,0.2,1)` (ease-out), exit `cubic-bezier(0.4,0,1,1)` (ease-in, faster than enter), move `cubic-bezier(0.4,0,0.2,1)`. Linear only for continuous spinners.
- **Animate only `transform` and `opacity`.** Never animate layout properties (width/height/top/left).
- **Patterns:** buttons press with a tiny `translate-y`; overlays fade + scale `0.97→1` + slight rise; sheets slide from edge; routes fade + small rise on mount; KPIs may count up (≤400ms).
- **Budget:** total motion in the initial viewport ≤ 800ms; scroll reveals fire once.
- **Always honor `prefers-reduced-motion`** — neutralize non-essential motion.

---

## 8. Components

Prefer composed primitives (shadcn/ui + Radix style). Every interactive component defines: `default · hover · active/pressed · focus-visible · disabled · loading · empty · error`.

- **Buttons:** variants `default · outline · secondary · ghost · destructive · link`. One primary action per view. Pending state shows a spinner + disabled.
- **KPI / stat cards:** semibold `tabular-nums` value; icon tile colored by **metric intent** (not always green); trend pill uses positive/negative tokens; has a loading skeleton.
- **Tables:** money/numeric columns **right-aligned** + `tabular-nums`; row hover; sortable headers show direction; always include loading skeleton, empty state, and error state. Mobile uses a card-list pattern.
- **Forms/inputs:** always paired with a label; use real Checkbox/Switch components (no raw HTML checkboxes); inline validation in the destructive color.
- **Modals/sheets:** titles + descriptions required; focus trap + return focus on close; motion per §7.
- **Badges/pills:** fully rounded; status/type colors from intent tokens; legible (AA).
- **Navigation:** consistent active treatment across desktop sidebar and mobile bottom nav; collapsed items get tooltips; nav items are labeled.

---

## 9. Data display & states

- **Currency:** format via locale-aware number formatting; always `tabular-nums`, right-aligned in tables.
- **Masking:** sensitive numbers shown as `•••• 1234`.
- **Empty states** are onboarding moments: icon + one line of guidance + a primary CTA (e.g. "Add your first account"). Distinguish *no data yet* from *no results for filters*.
- **Loading:** skeletons that match the final layout (not spinners) for content; spinners only for in-button async actions.
- **Errors:** one consistent error treatment with a retry affordance.
- **No dev-only labels, dead buttons, fake defaults, or permanent placeholder columns** shipped to users.

---

## 10. Anti-patterns (do not)

- Don't make every metric green — color by intent.
- Don't use red for neutral expenses (red = error/negative only).
- Don't put glass behind dense data or body text.
- Don't left-align proportional digits in money columns.
- Don't ship mocked numbers, dead buttons, or fake user defaults.
- Don't animate layout properties or exceed the motion budget.
- Don't hardcode colors that only work in one theme — support light + dark.
