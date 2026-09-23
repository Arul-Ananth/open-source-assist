# OpenSource Assist — UI Style Guide

Single source of truth for the visual language. New pages/components should be
assembled **only** from the tokens and classes listed here.

All tokens live in `src/index.css` (Tailwind v4 `@theme` + a few hand-written
classes). Dark theme is the default (`html.dark` in `index.html`); the light
theme overrides the same CSS variables under `html:not(.dark)`, so utilities
re-theme automatically — **never hardcode hex values in components**.

---

## 1. Color palette

| Token (`text-*`, `bg-*`, `border-*`) | Dark (default) | Light | Used for |
|---|---|---|---|
| `background` | `#0d1117` | `#f6f8fa` | Page background, input fields |
| `surface` | `#161b22` | `#ffffff` | Cards, nav pill, dialog, footer |
| `foreground` | `#e6edf3` | `#1f2328` | Primary text |
| `muted-foreground` | `#8b949e` | `#656d76` | Secondary text, body copy, icons |
| `border` | `#30363d` | `#d0d7de` | All 1px borders |
| `accent` | `#ff8c00` | `#e36209` | CTAs, active tab, brand mark, underline |
| `accent-secondary` | `#ffd700` | `#e36209` | Star icons, small secondary highlights |
| `on-accent` | `#0d1117` | `#0d1117` | Text/icon color on accent fills |
| `accent-text` | `#ff8c00` | `#bc4c0a` | Accent-colored **text**/links (AA-safe) |
| `accent-hover` | `#ffd700` | `#f07f1f` | Hover fill of accent buttons |

Rules:
- Accent is scarce: one primary CTA per view, active states, links. Body text
  is always `foreground` / `muted-foreground`.
- Use `accent-text` for orange *text* (it shifts darker in light mode for
  contrast); use `accent-hover` (not `accent`) for solid hover fills.
- Overlay: solid dim layer `bg-background/80` behind modals. The only
  translucent surfaces allowed are the nav bubble and modal overlay.

### Gradients (decoration only, never for body text)

| Class | Definition |
|---|---|
| `.bg-gradient-program` | `linear-gradient(100deg, #ff8c00 0%, #ff5e62 45%, #e84393 100%)` — rails, badges, `back-to-top` hover |
| `.bg-gradient-soft` | 10–14% alpha wash of the same hues — icon tiles, FinalCta panel |
| `.text-gradient-program` | Gradient clipped to text — hero tagline words only |

---

## 2. Typography

- Sans: **Inter Variable** (`font-sans`) — everything.
- Mono: **JetBrains Mono** (`font-mono`) — numbers, stats, chips, terminal,
  eyebrows, labels. If it's data or machine-ish, it's mono.

| Element | Class / pattern |
|---|---|
| Hero H1 | `text-4xl sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.1] tracking-tight` |
| Section H2 | `.section-h2` (mt-3, 3xl→4xl bold) + `.section-underline` (72×4px gradient bar below) |
| Section intro | `.section-body` (mt-4, max-w-[60ch], muted) |
| Eyebrow label | `.eyebrow` (mono xs uppercase tracking-[0.2em], accent-text, 24px dash before) |
| Body | `text-sm`–`text-base leading-relaxed text-muted-foreground` |
| Stat number | `font-mono text-3xl sm:text-4xl font-semibold text-accent-text` |

---

## 3. Layout & shape

- Container: `mx-auto max-w-[1240px] px-5 sm:px-8`; section rhythm `py-24`.
- Radius scale (`--radius-*`): `sm` 4px · `md` 10px · `lg` 14px · `xl` 18px.
  Cards/panels/dialogs = `rounded-xl`; pills = `rounded-full`; inputs/buttons = `rounded-md`/`rounded-lg`.
- Anchored sections need `scroll-mt-24` so the fixed nav never covers headings.

### Elevation (soft, layered — hard offset shadows are banned)

| Class | Use |
|---|---|
| `.shadow-soft-sm` | Subtle lift (nav rest state, secondary buttons) |
| `.shadow-soft` | Cards, nav pill |
| `.shadow-soft-lg` | Dialog panel, hero terminal, mobile menu |
| `.shadow-accent-glow` | Orange glow under accent fills (brand mark, primary buttons) |

---

## 4. Shared component classes (defined in `src/index.css`)

Buttons (or use `ui/button.tsx` variants `default`/`secondary`/`outline`/`ghost`, sizes `sm`/`default`/`lg`/`icon`):

- `.btn-primary` — accent fill, `text-on-accent`, hover lift + brightness, accent glow.
- `.btn-secondary` — surface fill, 1px border, hover: accent border + accent text.

Text/links:

- `.nav-link` — nav item; accent underline animates in via `data-active="true"` / hover / focus-visible.
- `.input-field` — form input: `h-9`, background fill, accent focus ring (`ring-accent/15`).

Chips:

- `.chip` — solid accent pill, mono 10px, on-accent text ("New" tag).
- `.chip-neutral` — bordered surface pill, mono 10px, muted text (stats, filters, tags).
- `.program-chip` — bordered pill, lifts + gradient wash on hover (partner logos).

Nav:

- `.nav-bubble` — scrolled nav state: rounded-[1.75rem] floating pill with blurred
  `background/85` fill. Managed by `src/components/Nav.tsx`; don't reuse elsewhere.

Auth dialog internals (keep in sync if you touch the dialog):

- `.auth-body` — the scrollable region (`min-height: 0; overflow-y: auto`).
- `.auth-footer` — pinned bottom strip (`flex-shrink: 0`).
- At `max-height: 730px` a compact tier hides `.auth-desc` / `.auth-switch` and
  trims padding so signup always fits one screen.

Misc:

- `.terminal-caret` — blinking accent block caret (hero typewriter).
- `.back-to-top` — fixed round FAB, gradient on hover.
- `.reveal` + `.is-visible` — scroll-entrance hook used by `<Reveal>`.

---

## 5. Motion

Entrances are one-shot, staggered, and cubic-bezier(0.22, 1, 0.36, 1).

| Class / API | Effect |
|---|---|
| `.animate-fade-up` | Fade + 16px rise — section content, cards (stagger with `animationDelay` inline style) |
| `.animate-pop-in` | Scale 0.96→1 + rise — dialogs, pop-in chips |
| `.animate-fade-in` | Pure fade — validation errors |
| `.animate-float-slow` | 5s infinite float — hero backdrop card |
| `.animate-pulse-dot` | 1.6s pulse — "live" dots |
| `.animate-shimmer` | Gradient sweep — skeleton loading |
| `<Reveal>` (`src/components/Reveal.tsx`) | Wraps scroll-triggered content; `delay` prop staggers children |
| `<AnimatedNumber>` (`src/components/AnimatedNumber.tsx`) | Counts `0 → target` on first viewport entry; comma formatting; stagger via `delay` |

Typewriter pattern (hero terminal): `setInterval` slicing a constant string at
~55ms/char; respect `prefers-reduced-motion` by rendering the full string.

**Every animation must degrade**: the global `prefers-reduced-motion` block
kills keyframes/transitions, and JS effects (count-up, typewriter) check
`matchMedia('(prefers-reduced-motion: reduce)')` themselves.

---

## 6. Component inventory

| Path | Notes |
|---|---|
| `src/components/ui/button.tsx` | cva variants — use instead of raw `<button>` where possible |
| `src/components/ui/card.tsx` | Card/CardHeader/CardContent/CardFooter, surface + border + soft shadow |
| `src/components/ui/badge.tsx` | Accent & secondary pills |
| `src/components/ui/dialog.tsx` | Portal-less modal: focus trap, Esc, scroll lock, `max-h` cap, pinned header/footer, scrollable body |
| `src/components/Nav.tsx` | Fixed header; on scroll becomes `.nav-bubble`; scroll-spy sets `data-active` |
| `src/components/Hero.tsx` | Typewriter terminal; entrance sequencing via `animationDelay` |
| `src/components/ProjectFinder.tsx` | GitHub data cards; React Query; batched contributor fetch |
| `src/components/Reveal.tsx`, `AnimatedNumber.tsx` | Motion primitives (see §5) |

---

## 7. Conventions

- Styling: Tailwind v4 utilities + the shared classes above; merge conditional
  classes with `cn()` from `src/lib/utils.ts`.
- Path alias `@` → `src/`.
- Icons: `lucide-react`, `size-4` inside buttons, `size-5` standalone.
- Dark-first design: check both themes before shipping a color change
  (`npm run check:contrast` exists for AA spot checks).
- A11y floor: visible `focus-visible:ring-2 ring-accent` on interactive
  elements, `aria-label` on icon-only buttons, `sr-only` headings on
  icon-only `dl` stats.
