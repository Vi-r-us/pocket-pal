# PocketPal Design Language

The single source of truth for how PocketPal looks, feels, and moves. Every screen, component, and animation should follow this document so the product feels like one coherent, modern, trustworthy finance app.

> Status: this is a specification. It describes the target system. Some tokens and utilities below are marked **(to adopt)** because they are not yet in the codebase; introduce them in a later implementation pass. Everything not marked is already live in [`src/index.css`](src/index.css) and [`tailwind.config.js`](tailwind.config.js).

The enforceable, condensed version of this doc lives at [`.cursor/rules/frontend-design-language.mdc`](../.cursor/rules/frontend-design-language.mdc). Keep the two in sync.

---

## 1. Principles

1. **Clarity over decoration.** Information is never ambiguous. The hero metric on every screen draws the eye first; supporting detail recedes (smaller type, muted color). Visuals serve the data, not the other way around.
2. **Trust through consistency.** A finance app earns trust by being predictable. The same action looks and behaves the same everywhere. Repeated patterns reduce cognitive load so the user stops thinking about the tool and focuses on their money.
3. **Accessibility is mandatory, not a QA step.** WCAG 2.1 AA contrast, full keyboard support, visible focus, and `prefers-reduced-motion` are non-negotiable foundations baked into every component.
4. **Motion is functional.** Every animation must do exactly one job: give **feedback**, guide **attention**, communicate a **state change**, or establish a **spatial relationship**. Motion without a job is decoration and is removed.
5. **One product, one language.** Auth screens, the app shell, dashboards, tables, and settings all share the same tokens, surfaces, and motion. No screen is an island.

---

## 2. Foundations

### 2.1 Color

PocketPal uses a calm green primary with a glassmorphism layer, defined as `oklch` CSS variables in [`src/index.css`](src/index.css) and mapped to Tailwind in [`tailwind.config.js`](tailwind.config.js). **Always use semantic tokens, never raw hex/oklch in components.**

#### Core semantic tokens (live)

| Token | Role |
| --- | --- |
| `background` / `foreground` | Page base + default text |
| `card` / `card-foreground` | Opaque surfaces (tables, forms, floating primitives) |
| `popover` / `popover-foreground` | Popover, dropdown, select, command surfaces |
| `primary` / `primary-foreground` | Primary actions, key emphasis |
| `secondary` / `secondary-foreground` | Secondary actions, quiet fills |
| `muted` / `muted-foreground` | Subtle backgrounds + supporting text |
| `accent` / `accent-foreground` | Highlights, active nav |
| `destructive` | Errors and destructive actions only |
| `border` / `input` / `ring` | Hairlines, field borders, focus ring |
| `sidebar-*` | Navigation shell surfaces |
| `glass` / `glass-strong` / `glass-border` / `glass-highlight` | Translucent surfaces |
| `chart-1` … `chart-5` | Data-viz series palette |

#### Finance-semantic aliases **(to adopt)**

Today, financial meaning is expressed with scattered hardcoded Tailwind colors (`emerald`, `rose`, `blue`) across `MetricStatCard`, `TransactionsPage`, `AccountsPage`, etc. Standardize them into intent tokens so meaning is consistent and themable:

| Token (to adopt) | Meaning | Current ad-hoc value |
| --- | --- | --- |
| `--trend-positive` | Gains, upward trend | emerald-600 / emerald-400 |
| `--trend-negative` | Losses, downward trend | red/rose-600 / 400 |
| `--type-income` | Income transactions | emerald |
| `--type-expense` | Expense transactions | rose |
| `--type-savings` | Savings / transfers | blue |
| `--status-active` | Active account / on state | emerald |
| `--status-inactive` | Inactive / off state | muted-foreground |

#### Color usage rules

- **Red is reserved** for errors, validation failures, and destructive actions. Never use red for a neutral expense figure unless it also encodes "negative/over budget."
- **Green is the brand and "positive" color.** Do not paint every metric icon green (see anti-patterns). Color by intent: income/positive → positive token, expense → expense token, savings → savings token, balance → primary/neutral.
- **Neutral backgrounds let data breathe.** Avoid high-saturation fills on primary screens; use `muted` for quiet zones.
- **Contrast:** body and supporting text must meet WCAG AA (4.5:1 for normal, 3:1 for large/UI). Re-check text on glass surfaces in both themes — translucent fills over the radial background tint are the most likely to fail.
- **Dark mode** is first-class. Use `dark:` variants and the token system; never hardcode a color that only works in one theme.

### 2.2 Typography

- **Family:** `DM Sans` (loaded globally, mapped to `font-sans`). Geist Variable (`@fontsource-variable/geist`) is available as an optional numeric/display face.
- **Scale (1.25 / major-third ratio):**

  | Step | Size | Use |
  | --- | --- | --- |
  | Display | 3rem / 48px | Marketing/hero only |
  | H1 | 1.875–2.25rem | Page title (`app-page-title`) |
  | H2 | 1.25–1.5rem | Section / panel title |
  | H3 | 1.125rem | Card title |
  | Body | 1rem / 16px | Default |
  | Body-sm | 0.875rem / 14px | Dense UI, table cells |
  | Caption | 0.75rem / 12px | Metadata, footers |

- **Weights:** 400 regular, 500 medium (labels/nav), 600 semibold (titles, KPI values), 700 sparingly.
- **Line-height:** tight (~1.2) for headings/numbers, snug (~1.45) for UI, relaxed (~1.7) for long copy.
- **Numbers — mandatory `tabular-nums`.** Every monetary value, percentage, and count uses tabular figures (`tabular-nums` / `font-variant-numeric: tabular-nums`) so columns and KPIs align and don't jitter on update. This applies to KPI values, table cells, budget figures, and chart axes.
- **Hierarchy:** one clear hero metric per screen; everything else is visibly subordinate via size + `muted-foreground`.

### 2.3 Spacing & layout

- **4px base grid, 8px rhythm.** Use Tailwind steps: `gap-2/4/6/8`, `p-4/6/8`. Avoid arbitrary one-off pixel values.
- **Page grid:** 12-column responsive grid via `app-page-grid`; place items with the `GridItem` helper (`span` / `mdSpan` / `lgSpan`).
- **Content frame:** all routed content sits inside `app-content-frame` (max width + responsive horizontal padding). Don't add competing max-widths.
- **Vertical stacks:** use `app-page-stack` spacing for top-level page sections.
- **Radius scale:** driven by `--radius: 1.25rem` → `rounded-lg` (cards/buttons), `rounded-md`, `rounded-sm`; pills use `rounded-full`. Keep radii consistent within a surface family.

### 2.4 Elevation & surfaces (glass vs. flat)

This is the rule that resolves the current auth-vs-app visual mismatch. **Decide a surface's material by its density, not by the screen.**

- **Use glass** (`.glass` / `.app-surface` / `glass-strong`) for: the app shell sidebar, header, mobile bottom nav, KPI/stat cards, modals/sheets/popovers, and marketing/auth hero surfaces.
- **Use opaque `card`** for: dense or text-heavy surfaces — data tables, forms, settings panels, anything where legibility over a busy background matters.
- **Never** stack `backdrop-blur` on tiny elements (e.g. a 44px icon tile) — it costs performance and is invisible. Reserve blur for real panels.
- **Shadows** come from the `--shadow-*` / `shadow-glass` tokens only. Elevation communicates layering (resting < raised < overlay); don't invent shadows.
- Keep the radial background tint (defined on `body`) as the ambient backdrop; surfaces float above it.

#### Liquid Glass material

An Apple-inspired evolution of the frosted glass, driven by the `--lg-*` tokens in [`src/index.css`](src/index.css). It adds a light-aware **specular rim**, layered translucent fill, depth highlights, and (where supported) real **edge refraction**. Same placement rules as glass above — it is for chrome and floating surfaces, never behind dense data.

Two tiers:

- **Tier 1 — `.liquid-glass` / `.liquid-glass-strong` (default, all browsers).** Pure CSS: `backdrop-filter: blur() saturate() brightness()`, a layered gradient fill, inset top/bottom highlights, soft shadow, and a masked gradient-border rim on `::after`. This is the baseline material to reach for on shell, header, sidebar, bottom nav, KPI cards, modals/sheets, and the auth hero.
- **Tier 2 — `.liquid-glass-refract` (progressive enhancement).** Adds genuine edge lensing via an SVG `feTurbulence` + `feDisplacementMap` filter referenced through `backdrop-filter: url(#liquid-refraction)`, gated behind `@supports`. **Browser reality:** this renders in Chromium; Safari/Firefox fall back to Tier 1 automatically. Activating Tier 2 in the live app requires mounting the `<filter id="liquid-refraction">` SVG once at the app root — deferred to a rollout pass; it is demonstrated today in [`design/index.html`](../design/index.html).

Constraints (non-negotiable):

- **Legibility first.** Keep tables, forms, and any dense numeric surface on opaque `card`. Liquid Glass never sits directly behind body text or data.
- **Accessibility fallbacks are built in.** Under `prefers-reduced-transparency: reduce` or `prefers-contrast: more`, the material drops blur/translucency to the near-opaque `--lg-fallback` surface; under `prefers-reduced-motion`, no fluid motion plays.
- **Performance.** Don't stack the material on tiny elements; reserve it for real panels. Tier 2 refraction is GPU-heavy — use it only on large, low-frequency surfaces.

### 2.5 Iconography

- **Library:** `lucide-react` exclusively. Don't mix icon sets.
- **Sizes:** `size-4` (16px) inline/in buttons, `size-5` (20px) nav/standalone. Match icon weight to text.
- **Decorative icons** get `aria-hidden`; **icon-only controls** get an `aria-label` (and a tooltip where the meaning isn't obvious, e.g. collapsed sidebar).
- Icon color follows the same intent tokens as text (§2.1).

---

## 3. Motion system

Motion is a first-class part of the design language. The goal is a product that feels alive and responsive without ever feeling slow. Principles synthesized from current industry guidance (see References).

### 3.1 Motion principles

- **Every animation has a job:** feedback, attention, state change, or spatial relationship. If you can't name the job, remove it.
- **Physics, not linear.** Easing mirrors real movement.
- **Timing follows scope.** Bigger/rarer = a touch longer; high-frequency = near-instant.
- **Interruptible.** State drives the animation, never the reverse — a user can always reverse or dismiss mid-motion.
- **Animate compositor-friendly properties only:** `transform` and `opacity`. Avoid animating `width`, `height`, `top/left`, `box-shadow`, or layout-triggering properties.

### 3.2 Duration tokens **(to adopt)**

```css
--motion-fast: 120ms;     /* hover, focus, press, toggle, checkbox */
--motion-standard: 220ms; /* dropdown, tooltip, popover, accordion */
--motion-slow: 400ms;     /* modal, sheet, route/page transition */
```

Ranges: micro-interactions 100–200ms · component state 200–300ms · page/large 300–500ms. **Nothing exceeds 500ms.** If unsure, go shorter — 150ms feels snappy, 500ms feels sluggish, 800ms feels broken.

### 3.3 Easing tokens **(to adopt)**

```css
--ease-enter: cubic-bezier(0, 0, 0.2, 1);      /* ease-out: elements entering */
--ease-exit: cubic-bezier(0.4, 0, 1, 1);       /* ease-in: elements leaving */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1); /* ease-in-out: A→B on same element */
/* linear: ONLY for indeterminate spinners / continuous loops */
```

- Entrances use `--ease-enter` (fast start, soft settle → feels responsive).
- Exits use `--ease-exit` and are **faster than entrances** (the user already decided; don't make them wait).
- Movement between two states of one element uses `--ease-standard`.

### 3.4 Patterns (implement with current tools — no new deps)

The stack already includes `tw-animate-css`, Radix (`data-[state]` attributes), `recharts`, and `sonner`. Use them:

| Pattern | Spec | How |
| --- | --- | --- |
| Hover / press | ≤120ms, `--ease-standard`; press uses subtle `translate-y-px` (already in `Button`) | Tailwind `transition-*` + transform |
| Focus ring | Appears instant, hides ~150ms | `focus-visible` ring tokens |
| Dropdown / popover / tooltip / select | 200–220ms enter (`--ease-enter`), faster exit | Radix `data-[state=open/closed]` + animate utilities |
| Modal / dialog | Overlay fade + content scale `0.97→1` + slight rise, ~250–300ms | Radix Dialog `data-[state]` |
| Sheet / drawer | Slide from edge ~250ms enter, ~200ms exit | Radix Sheet `data-[state]` |
| Route / page transition | Fade + small rise, 200–300ms, on mount only | CSS keyframe on the page container |
| List / table rows | Optional short stagger (≤200ms total) on first render only | `animate-*` with per-item delay |
| Skeleton / loading | Steady ambient shimmer, continuous, low-contrast | existing `Skeleton` |
| KPI numbers | Optional count-up on first paint / value change, ≤400ms | small CSS/JS counter (no lib) |
| Toast | Slide + fade in, auto-dismiss | `sonner` defaults |

### 3.5 Motion budget & performance

- No single animation > 500ms.
- Total animation visible in the **initial viewport ≤ 800ms** combined.
- Scroll-triggered reveals fire **once**, not on every re-entry.
- Keep INP < 200ms; start motion immediately on interaction (no perceptible lag before it begins).

### 3.6 Reduced motion (required)

Always honor `prefers-reduced-motion`. Provide a global fallback that neutralizes non-essential motion **(to adopt in `src/index.css`)**:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Never use motion that flashes, rapidly oscillates, or sweeps large screen areas. The UI must be fully usable with all motion disabled.

### 3.7 Animation library policy

CSS + `tw-animate-css` + Radix `data-state` covers this entire spec with **zero new dependencies** — this is the default. A dedicated library (`framer-motion` / `motion`) is an **optional future enhancement only** and must be approved first per [`.cursor/rules/dependencies-approval.mdc`](../.cursor/rules/dependencies-approval.mdc). Do not introduce it speculatively.

---

## 4. Component standards

Prefer shadcn/ui + Radix primitives; compose, don't fork. Every interactive component must define this **state matrix**: `default · hover · active/pressed · focus-visible · disabled · loading · empty · error`.

- **Buttons** ([`src/components/ui/button.tsx`](src/components/ui/button.tsx)): variants `default · outline · secondary · ghost · destructive · link`. Primary action per view is `default`; destructive uses `destructive`. Show a `Loader2` spinner + disabled while pending. One primary button per context.
- **KPI / stat cards** ([`src/components/cards/MetricStatCard.tsx`](src/components/cards/MetricStatCard.tsx)): value uses semibold + `tabular-nums`; the icon tile is colored by **metric intent** (not always green); trend pill uses `--trend-positive/negative`. Provide a skeleton variant for loading.
- **Tables** ([`src/components/data-table`](src/components/data-table)): money/numeric columns are **right-aligned** and `tabular-nums`; row hover feedback; sortable headers show direction; always provide loading skeleton, empty state, and error state. Mobile uses the card-list pattern already established.
- **Forms / inputs:** always pair with a `Label` (or `aria-label`); use the shadcn `Checkbox`/`Switch` everywhere — **no raw `<input type="checkbox">`** (the login "Remember me" is the current exception to fix). Inline validation messages in `destructive`.
- **Modals / sheets / dialogs:** use `AppModal` / Radix wrappers; titles + descriptions required; motion per §3.4; focus trap + return focus on close (Radix handles this).
- **Badges / pills:** `rounded-full`; status/type colors from intent tokens; keep text legible (AA).
- **Navigation:** active state is visually consistent between desktop sidebar and mobile bottom nav (pick one active treatment); collapsed sidebar items need tooltips; bottom-nav items need labels or a clearly reduced, recognizable set.
- **Empty / error / loading states are part of every data component**, not afterthoughts (see §5).

---

## 5. Data display & states conventions

- **Currency:** format via `Intl.NumberFormat`; derive locale from the currency/user preference rather than hardcoding `en-IN` for every currency. Always `tabular-nums`, right-aligned in tables.
- **Masking:** sensitive numbers (account numbers) masked as `•••• 1234`.
- **No dev-only labels in the UI** (e.g. a "Server data" badge). User-facing text describes user meaning.
- **Empty states** are onboarding moments: icon + one line of guidance + a primary CTA (e.g. "Add your first account"). Distinguish *no data yet* from *no results for current filters* (the latter offers "Clear filters").
- **Loading:** use skeletons that match final layout (not spinners) for content; reserve spinners for in-button/async actions.
- **Errors:** one shared, consistent error treatment with a retry affordance — not a different style per page.
- **No placeholder columns/fields shipped to users** (e.g. an always-em-dash "Change" column). Hide a feature until it has data.

---

## 6. Consistency checklist & anti-patterns

Use this as a pre-merge checklist. Each "Don't" maps to a real pattern observed in the current app.

- [ ] **Do** wire screens to real data with skeletons. **Don't** ship mocked/hardcoded numbers (e.g. the Dashboard's static `$56,200`).
- [ ] **Do** hide actions that don't work yet. **Don't** render dead buttons (e.g. "Add Goal" on a placeholder page).
- [ ] **Do** bind settings/profile to the real user. **Don't** ship fake defaults like "John Doe".
- [ ] **Do** remove unfinished UI. **Don't** show permanent placeholder columns ("Change" = "—").
- [ ] **Do** apply the glass-vs-flat rule consistently. **Don't** make auth premium and the app plain.
- [ ] **Do** color KPI icons/tiles by intent. **Don't** make every metric green.
- [ ] **Do** use `tabular-nums` + right-align for money. **Don't** left-align proportional digits in tables.
- [ ] **Do** use shadcn form controls everywhere. **Don't** drop in raw HTML checkboxes.
- [ ] **Do** add tooltips to icon-only controls and labels to nav. **Don't** ship unlabeled icon rows.
- [ ] **Do** define duration/easing via motion tokens. **Don't** scatter inline ad-hoc timings or use linear easing for UI.
- [ ] **Do** honor `prefers-reduced-motion`. **Don't** animate layout properties or exceed the motion budget.
- [ ] **Do** keep one primary action per view and consistent active nav states.

---

## 7. References

Motion:
- Mantlr — [Motion Design 2026: What Most Designers Get Wrong](https://mantlr.com/blog/motion-design-principles-2026)
- Monotonomo — [Motion with Restraint: The 2026 Motion Budget for Fast Sites](https://www.monotonomo.com/journal/motion-budget-fast-sites-2026/)
- Atlassian Design — [Motion foundations](https://atlassian.design/foundations/motion)
- adamarant — [Functional UI animation in 2026: the checklist before it ships](https://adamarant.com/en/blog/functional-ui-animation-in-2026-the-checklist-before-it-ships)

Fintech design systems:
- Eleken — [Fintech design guide with patterns that build trust (2026)](https://www.eleken.co/blog-posts/modern-fintech-design-guide)
- Gapsy — [How to Architect a Scalable Fintech Design System](https://gapsystudio.com/blog/fintech-design-system/)
- Ed Chen — [Institutional Finance Design System (token scales)](https://edwson.com/design-system-showcase.html)
- wsa.design — [Fintech SaaS Design: turning complexity into clear UX](https://wsa.design/news/fintech-saas-design-how-to-turn-product-complexity-into-clear-ux)
