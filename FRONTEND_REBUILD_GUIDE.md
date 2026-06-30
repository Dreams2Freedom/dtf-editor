# DTF Editor — Front-End Rebuild Guide

> **Audience:** The front-end partner joining the DTF Editor build.
> **Purpose:** Catch you up on the existing stack and design system, then hand
> you a paste-ready prompt (Section 10) to start rebuilding the **public +
> marketing pages**.
> **Last updated:** 2026-06-04

---

## 1. Overview & Ground Rules

DTF Editor is a **mobile-first web app** for creating print-ready Direct-to-Film
(DTF) transfers — upscaling, background removal, vectorization, color change, and
AI image generation. The logged-in app and admin panel are already built and
working. **This rebuild is the public-facing marketing surface only** — the
pages a visitor sees before they log in.

### The 5 rebuild rules

1. **Same stack, same component library.** Next.js 15 (App Router), React 19,
   Tailwind CSS 4, Radix UI, CVA, Zustand, lucide-react. Don't introduce new
   frameworks or swap the UI primitives.
2. **BEM naming** for component/semantic classes (see Section 6).
3. **CSS Grid over Flexbox** wherever the layout is 2-D (see Section 6).
4. **Mobile-first.** Author base styles for the smallest screen, layer up.
5. **Visual refresh, same brand colors.** Keep the blue + orange palette and
   Inter font (Section 3); modernize layout, spacing, and component styling.

### Scope — what you own vs. what's off-limits

| ✅ In scope (rebuild these) | 🚫 Off-limits (do not touch) |
| --- | --- |
| Landing `/`, `/pricing`, `/about`, `/blog`, `/faq`, `/contact`, `/terms`, `/privacy`, `/coming-soon` | `/dashboard`, `/process/*`, `/generate`, `/settings`, `/storage` (the logged-in app) |
| `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password` | `/admin/*` (admin panel) |
| Marketing components in `src/components/public/` | Anything in `src/app/api/*` (server routes) |
| Layout shells where they affect public pages | Auth logic, middleware, Stripe/Supabase services |

If a change to a shared file (e.g. `Header.tsx`, `Footer.tsx`, `globals.css`)
is needed, flag it first — those render on app pages too.

---

## 2. Tech Stack Snapshot

| Package | Version | Role |
| --- | --- | --- |
| `next` | 15.5.8 | Framework (App Router) |
| `react` / `react-dom` | 19.1.0 | UI runtime |
| `typescript` | ^5 | Types |
| `tailwindcss` | ^4 | Styling (utility-first) |
| `@tailwindcss/forms` / `typography` / `aspect-ratio` | — | Tailwind plugins |
| `class-variance-authority` | 0.7.1 | Component variants (CVA) |
| `clsx` + `tailwind-merge` | 2.1.1 / 3.3.1 | `cn()` class merging |
| `lucide-react` | 0.468.0 | Icon library |
| `@radix-ui/react-*` | dialog 1.1.2, dropdown-menu 2.1.16, checkbox 1.3.3, toast 1.2.2 | Accessible primitives |
| `react-hook-form` | 7.54.2 | Forms |
| `zod` | 3.25.76 | Schema validation |
| `zustand` | 5.0.2 | Global state (auth store) |

### npm scripts

```bash
npm run dev          # Dev server → http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
npm run format       # Prettier write
npm test             # Vitest
```

---

## 3. Design Tokens — The Source of Truth

These are defined in `tailwind.config.ts` and mirrored as CSS variables in
`src/app/globals.css` (`@theme` block). **Do not change the hex values** — the
refresh keeps the brand. Use the Tailwind class names (`bg-primary-500`,
`text-accent-600`, etc.), not raw hex.

### Color palette (light mode only — dark mode is intentionally off)

**Primary (brand blue)** — structure, links, headings
| 50 | 100 | 200 | 300 | 400 | **500** | **600** | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|
| `#f0f4f8` | `#d9e2ec` | `#bcccdc` | `#9fb3c8` | `#829ab1` | **`#366494`** | **`#233E5C`** | `#1e3a5c` | `#152a45` | `#0f1f2e` |

`primary-500 #366494` is the main brand color; `primary-600 #233E5C` is the
hover/darker state.

**Accent (brand orange)** — reserve for primary CTAs
| 50 | 100 | 200 | 300 | 400 | **500** | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|
| `#fef7f0` | `#fdecd8` | `#fbd5b0` | `#f8b87d` | `#f59448` | **`#E88B4B`** | `#e06a2b` | `#b94f22` | `#933f22` | `#77351f` |

**Semantic (500 / 600 shown; full 50–900 scales exist)**
| Token | 500 | 600 | Use |
| --- | --- | --- | --- |
| `success` | `#10b981` | `#059669` | confirmations |
| `error` | `#ef4444` | `#dc2626` | errors/destructive |
| `warning` | `#f59e0b` | `#d97706` | cautions |
| `info` | `#3b82f6` | `#2563eb` | informational |

**Gray** — full `50 #f9fafb` → `950 #030712` scale for text and surfaces.

> Note: the config also defines `dark` and `light` color scales — these are
> legacy and rarely used. Prefer `primary` / `accent` / `gray`.

### Typography

- **Font:** Inter, loaded via `next/font/google` in `src/app/layout.tsx` and
  applied to `<body>`. Mono fallback: JetBrains Mono.
- **Scale** (`font-size` / `line-height`):
  `xs 0.75/1rem` · `sm 0.875/1.25` · `base 1/1.5` · `lg 1.125/1.75` ·
  `xl 1.25/1.75` · `2xl 1.5/2` · `3xl 1.875/2.25` · `4xl 2.25/2.5` · `5xl 3/1`
- **Heading conventions in use:** h1 `text-3xl`/`text-4xl` `font-bold`,
  section titles `text-2xl`/`text-3xl` `font-bold`, card titles `text-lg`
  `font-semibold`, labels `text-sm` `font-medium text-gray-700`.

### Spacing / radius / shadow / breakpoints / motion

- **Spacing scale:** `1 .25rem` · `2 .5` · `3 .75` · `4 1` · `5 1.25` · `6 1.5`
  · `8 2` · `10 2.5` · `12 3` · `16 4` · `20 5rem`.
- **Border radius:** `sm .125` · `md .375` · `lg .5` · `xl .75` · `2xl 1rem` ·
  `full 9999px`.
- **Shadows:** `sm` `0 1px 2px rgb(0 0 0/.05)` · `md` `0 4px 6px -1px rgb(0 0 0/.1)`
  · `lg` `0 10px 15px -3px rgb(0 0 0/.1)` · `xl` `0 20px 25px -5px rgb(0 0 0/.1)`.
- **Breakpoints:** `xs 475` · `sm 640` · `md 768` · `lg 1024` · `xl 1280` ·
  `2xl 1536`.
- **Animations:** `animate-fade-in`, `animate-slide-up`, `animate-slide-down`,
  `animate-scale-in`, `animate-pulse-slow` (keyframes in the config).

---

## 4. Component Library Reference

Reusable primitives live in **`src/components/ui/`**. **Reuse these — don't
fork or rebuild them.** They use CVA for variants and the `cn()` helper
(`src/lib/utils.ts` = `clsx` + `tailwind-merge`) for class merging, with
`React.forwardRef`. Icons come from `lucide-react`.

| Component | Key variants / props |
| --- | --- |
| **Button** | `variant`: default · secondary · outline · ghost · accent · destructive · success · `size`: sm/md/lg/xl · `fullWidth`, `loading`, `leftIcon`, `rightIcon` |
| **Card** + subparts | `variant`: default/outlined/elevated · `padding`: none/sm/md/lg · `CardHeader` `CardTitle` `CardDescription` `CardContent` `CardFooter` |
| **Input / Select / Textarea** | `label`, `error`, `helperText`, `leftIcon`/`rightIcon`, forwardRef, native attrs |
| **Badge** | `variant`: default/secondary/success/warning/error/info/outline · `size`: sm/md/lg |
| **Alert** + subparts | `variant`: default/info/success/warning/error · `AlertTitle` `AlertDescription` |
| **Modal / Dialog** | Radix-based; Modal: `open`, `onOpenChange`, `title`, `size` sm/md/lg/xl/full |
| **DropdownMenu** | Radix wrapper (trigger/content/item/checkbox/radio/label/separator) |
| **Toast** + `ToastProvider` | `variant`: default/success/error/warning/info · `duration` |
| **Loading** | `variant`: spinner/dots/pulse · `size` sm/md/lg/xl · `LoadingOverlay`, `LoadingSkeleton` |
| **Checkbox**, **Breadcrumb** | Radix checkbox; breadcrumb with `items` |

`src/components/ui/Showcase.tsx` renders many of these together — a quick
visual reference.

### Layout shells (`src/components/layout/`)

- **`Header.tsx`** — top nav with dropdown menus, mobile burger, credit display,
  user avatar menu. Renders on app pages too — change carefully.
- **`Footer.tsx`** — dark (`bg-gray-900`) footer with Product/Tools/Support/
  Business/Legal sections.
- **`AppLayout.tsx`** — decides when to show Header/Footer (hidden on `/auth/*`,
  `/admin/*`, the clippingmagic editor, and `/`).
- **`AuthLayout.tsx`** — two-column auth layout (form left, branded dark panel
  with amber glow right).

### Marketing components (`src/components/public/`) — your main workshop

`LandingHero.tsx` · `ToolShowcase.tsx` · `ToolMockup.tsx` · `HowItWorks.tsx` ·
`WhyDTFEditor.tsx` · `PricingTeaser.tsx` · `LandingFAQ.tsx` · `LandingCTA.tsx` ·
`PageHero.tsx` · `Accordion.tsx`

---

## 5. Pages In Scope (Route Map)

All under `src/app/`. Each folder has a `page.tsx`.

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `page.tsx` | Landing — hero, tool showcase, how-it-works, why, pricing teaser, FAQ, CTA |
| `/pricing` | `pricing/page.tsx` | Plans & tier comparison |
| `/about` | `about/page.tsx` | About the product/company |
| `/blog` | `blog/page.tsx` | Blog listing |
| `/faq` | `faq/page.tsx` | Frequently asked questions |
| `/contact` | `contact/page.tsx` | Contact form |
| `/terms` | `terms/page.tsx` | Terms of service |
| `/privacy` | `privacy/page.tsx` | Privacy policy |
| `/coming-soon` | `coming-soon/page.tsx` | Coming-soon placeholder |
| `/auth/login` | `auth/login/page.tsx` | Sign in |
| `/auth/signup` | `auth/signup/page.tsx` | Register |
| `/auth/forgot-password` | `auth/forgot-password/page.tsx` | Request password reset |
| `/auth/reset-password` | `auth/reset-password/page.tsx` | Set new password |

> `/auth/callback` is a redirect handler with no real UI — leave it alone.

---

## 6. The Three New Conventions (read carefully)

This is the heart of the rebuild. The existing code is utility-soup Tailwind in
JSX. We're introducing structure.

### 6.1 BEM naming

We're moving styling out of long `className` strings and into **BEM-named
semantic classes**, with Tailwind utilities composed via `@apply`. This keeps
markup readable and centralizes styling.

**Naming rules**
- `.block` — a standalone component (`.hero`, `.pricing-card`, `.feature-grid`).
- `.block__element` — a part of the block (`.hero__title`, `.pricing-card__price`).
- `.block--modifier` / `.block__element--modifier` — a variant/state
  (`.pricing-card--featured`, `.hero__cta--primary`).
- **kebab-case** names. **No deep nesting** — keep it `block__element`, never
  `block__el1__el2`. One modifier expresses one idea.

**Where the CSS lives:** a co-located CSS Module per component
(`Hero.module.css`) **or** a `@layer components { … }` block in `globals.css`
for shared marketing classes. Prefer CSS Modules for page-specific blocks.

**Before (current utility soup):**
```tsx
<section className="relative grid place-items-center gap-6 px-4 py-20 text-center">
  <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Print-ready DTF transfers</h1>
  <a className="inline-flex h-12 items-center rounded-lg bg-accent-500 px-6 text-white hover:bg-accent-600">
    Get started
  </a>
</section>
```

**After (BEM + `@apply`):**
```tsx
// Hero.tsx
import styles from './Hero.module.css';

<section className={styles.hero}>
  <h1 className={styles.hero__title}>Print-ready DTF transfers</h1>
  <a className={`${styles.hero__cta} ${styles['hero__cta--primary']}`}>Get started</a>
</section>
```
```css
/* Hero.module.css */
.hero            { @apply relative grid place-items-center gap-6 px-4 py-20 text-center; }
.hero__title     { @apply text-3xl font-bold text-gray-900; }
.hero__cta       { @apply inline-flex h-12 items-center rounded-lg px-6 transition-colors; }
.hero__cta--primary { @apply bg-accent-500 text-white hover:bg-accent-600; }

@media (min-width: 640px) {
  .hero__title { @apply text-4xl; }
}
```

> **Reusing `ui/` primitives still wins.** If a `<Button variant="accent">`
> already does the job, use it — don't recreate it as a BEM class. Use BEM for
> page/section layout blocks, not for re-implementing existing primitives.

### 6.2 CSS Grid over Flexbox

Default to **Grid** for any 2-D / multi-column layout. Keep **Flexbox** only for
genuinely 1-D rows.

| Use **Grid** for | Use **Flexbox** for |
| --- | --- |
| Page section layout, hero with named areas | Nav bar item rows |
| Pricing tiers, feature cards, tool galleries | Inline icon + label |
| Image grids, footers with column sections | Button groups |
| Anything that wraps into responsive columns | Centering a single item |

**Responsive card grid (pricing / features):**
```css
.pricing-grid { @apply gap-6; display: grid; grid-template-columns: 1fr; }

@media (min-width: 768px) {
  .pricing-grid { grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
}
```

**Hero with named grid areas:**
```css
.hero {
  display: grid;
  gap: 1.5rem;
  grid-template-areas: "copy" "art";
}
.hero__copy { grid-area: copy; }
.hero__art  { grid-area: art; }

@media (min-width: 1024px) {
  .hero {
    grid-template-columns: 1.1fr 0.9fr;
    grid-template-areas: "copy art";
    align-items: center;
  }
}
```
> Tailwind grid utilities (`grid grid-cols-1 md:grid-cols-3 gap-6`) are fine too —
> the point is **grid, not flex**, for these layouts. Reach for raw CSS Grid
> (named areas, `auto-fit`/`minmax`) when utilities get awkward.

### 6.3 Mobile-first

- Write the **base style for mobile** (single column), then add complexity at
  `sm:` → `md:` → `lg:` (Tailwind), or `min-width` media queries in BEM CSS.
  Never start desktop-first with `max-width` overrides.
- Layouts collapse to **one column** on mobile and expand to grid at `md`+.
- **Touch targets ≥ 44px** (buttons/links). Inputs at least `h-11`/`h-12`.
- Prefer **fluid type** for big headings (e.g. `clamp(1.875rem, 5vw, 3rem)`)
  so the hero scales smoothly.
- Test at 375px width first, then 768px, then 1280px.

---

## 7. Visual Refresh Guidance

Same brand, modernized execution:

- **Color usage:** accent-orange (`accent-500`) is reserved for the **primary
  CTA** on a section — one per view. Primary-blue (`primary-500/600`) for
  structure, links, and secondary actions. Gray scale for text/surfaces.
- **Whitespace:** be generous — larger section padding (`py-16`/`py-20`),
  consistent `gap-6`/`gap-8` in grids.
- **Consistency:** use the radius (`rounded-lg`/`rounded-xl`) and shadow
  (`shadow-md`/`shadow-lg`) tokens — don't invent new ones.
- **Don't fork primitives.** Compose pages from `ui/` components + BEM layout
  blocks.
- **Motion:** subtle only — `animate-fade-in` / `animate-slide-up` on section
  reveal. No heavy/janky animation.

---

## 8. Workflow & Guardrails

**Workflow**
1. Branch off, run `npm run dev` (→ `localhost:3000`).
2. Build mobile-first; verify at 375px **before** desktop.
3. Reuse `src/components/ui/` primitives; add BEM CSS Modules for layout blocks.
4. Run `npm run lint` **and** `npm run type-check` before every commit.
5. Commit with clear messages; **deploy via GitHub** (project rule).

**Guardrails — don't:**
- Change the brand hex values in `tailwind.config.ts` / `globals.css`.
- Change the public API/props of `src/components/ui/*` primitives.
- Touch `src/app/api/*`, auth logic, middleware, or Stripe/Supabase services.
- Edit dashboard, processing tools, `/generate`, settings, storage, or admin.
- Modify shared shells (`Header`, `Footer`, `AppLayout`) without flagging first —
  they render on logged-in pages too.

---

## 9. Quick Reference

```
src/
  app/
    page.tsx                  ← landing
    pricing|about|blog|faq|contact|terms|privacy|coming-soon/page.tsx
    auth/login|signup|forgot-password|reset-password/page.tsx
    layout.tsx                ← root layout, Inter font, providers
    globals.css               ← @theme tokens + @layer components BEM
  components/
    ui/                       ← REUSE these primitives (Button, Card, ...)
    layout/                   ← Header, Footer, AppLayout, AuthLayout (shared)
    public/                   ← marketing sections (your workshop)
  lib/utils.ts                ← cn() helper
tailwind.config.ts            ← design tokens (do not change hex)
```

---

## 10. Paste-Ready Prompt for Claude Code

Copy everything in the block below into a fresh Claude Code session in the repo
to start building.

````text
You are helping rebuild the PUBLIC + MARKETING front end of DTF Editor, a
mobile-first Next.js web app for creating print-ready Direct-to-Film transfers.
The logged-in app and admin panel are already built — DO NOT touch them.

## Stack (keep as-is; do not introduce new frameworks)
Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI,
class-variance-authority (CVA), Zustand, lucide-react icons. Class merging via
cn() in src/lib/utils.ts (clsx + tailwind-merge).

## Scope — rebuild ONLY these pages
- Landing:  src/app/page.tsx
- Marketing: src/app/{pricing,about,blog,faq,contact,terms,privacy,coming-soon}/page.tsx
- Auth UI: src/app/auth/{login,signup,forgot-password,reset-password}/page.tsx
- Marketing sections live in src/components/public/

OFF-LIMITS — do not edit: src/app/dashboard, /process, /generate, /settings,
/storage, /admin, anything in src/app/api/*, auth logic, middleware, or
Stripe/Supabase services. Don't change the public props of src/components/ui/*.
Don't change shared shells (Header, Footer, AppLayout) without flagging it first —
they also render on logged-in pages.

## Three conventions to follow
1. BEM naming. Move styling out of long className strings into BEM-named
   classes (.block, .block__element, .block--modifier; kebab-case; no deep
   nesting) in co-located CSS Modules (e.g. Hero.module.css), composing Tailwind
   utilities via @apply. Example:
     .hero            { @apply relative grid place-items-center gap-6 px-4 py-20; }
     .hero__title     { @apply text-3xl font-bold text-gray-900; }
     .hero__cta--primary { @apply bg-accent-500 text-white hover:bg-accent-600; }
   BUT: if an existing src/components/ui primitive (Button, Card, Badge, Input,
   Alert, Modal…) already does the job, REUSE it — don't recreate it as BEM.
2. CSS Grid over Flexbox for any 2-D/multi-column layout (page sections, hero,
   pricing tiers, feature/tool card galleries, footers). Use auto-fit + minmax
   and named grid-template-areas where helpful. Flexbox only for 1-D rows
   (nav bars, inline icon+label, button groups).
3. Mobile-first. Base styles target ~375px (single column); layer up with sm:
   md: lg: or min-width media queries. Touch targets >= 44px. Fluid type
   (clamp) for large headings. Verify at 375px before desktop.

## Visual refresh — SAME brand colors, modernized execution
Use Tailwind token classes, never raw hex. Keep light mode only.
- Primary blue: primary-500 #366494 (brand), primary-600 #233E5C (hover) —
  structure, links, secondary actions.
- Accent orange: accent-500 #E88B4B — reserve for the ONE primary CTA per view.
- Semantic: success #10b981, error #ef4444, warning #f59e0b, info #3b82f6.
- Gray 50 #f9fafb → 950 #030712 for text/surfaces.
- Font: Inter (already loaded in src/app/layout.tsx).
- Radius rounded-lg/rounded-xl; shadow-md/shadow-lg; generous whitespace
  (py-16/py-20, gap-6/gap-8); subtle motion (animate-fade-in / animate-slide-up).
Tokens are defined in tailwind.config.ts and src/app/globals.css — DO NOT change
the hex values.

## Reuse these primitives (src/components/ui/)
Button (variant default/secondary/outline/ghost/accent/destructive/success,
size sm/md/lg/xl, loading, leftIcon/rightIcon, fullWidth), Card (+Header/Title/
Description/Content/Footer), Input/Select/Textarea (label/error/helperText/icons),
Badge, Alert, Modal/Dialog, DropdownMenu, Toast, Loading/Skeleton, Checkbox,
Breadcrumb. See src/components/ui/Showcase.tsx for a live reference.

## Workflow
Run `npm run dev`. Build mobile-first and verify at 375px, 768px, 1280px. Run
`npm run lint` AND `npm run type-check` before committing. Deploy via GitHub.

Start by reading src/app/page.tsx and src/components/public/ to see the current
landing structure, then propose a rebuild plan for the landing page before
writing code.
````
