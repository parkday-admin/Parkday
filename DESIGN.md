---
name: Parkday
description: Warm, ticket-inspired trip finance & planning system for Disney vacations
colors:
  night: "#0D2340"
  night-card: "#132B4D"
  sky: "#2A6FE0"
  sky-dark: "#1E5AC4"
  gold: "#F5B536"
  gold-dark: "#C68A12"
  coral: "#E0533F"
  teal: "#2CA58D"
  teal-dark: "#1B7D68"
  cream: "#F0EDE8"
  cream-light: "#FFF6E7"
  bg: "#F3EEE3"
  white: "#FFFFFF"
  ink: "#20242C"
  border: "rgba(13, 35, 64, 0.28)"
  border-light: "rgba(13, 35, 64, 0.1)"
  text-secondary: "rgba(13, 35, 64, 0.6)"
  text-tertiary: "rgba(13, 35, 64, 0.42)"
  sky-bg: "rgba(42, 111, 224, 0.1)"
  gold-bg: "rgba(245, 181, 54, 0.15)"
  teal-bg: "rgba(44, 165, 141, 0.15)"
  coral-bg: "rgba(224, 83, 63, 0.1)"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "23px–40px"
    fontWeight: 400
    lineHeight: 1.05
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "150%"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "10px–12.5px"
    fontWeight: 600
  secondary:
    fontFamily: "Inter, system-ui, sans-serif"
    fontWeight: 500
rounded:
  sm: "8px"
  md: "11px"
  lg: "16px"
  xl: "20px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.night}"
    rounded: "{rounded.md}"
    padding: "13px"
  button-primary-hover:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.night}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "13px"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.lg}"
  card-hero:
    backgroundColor: "{colors.night}"
    rounded: "{rounded.md}"
---

# Design System: Parkday

## Overview

**Creative North Star: "The Park Ticket"**

Parkday reads like a keepsake admission ticket, not a finance app. Warm cream paper stock, deep navy ink, and a gold-foil accent do the work that a typical fintech product would hand to sterile grays and a single saturated blue. A serif display face (Fraunces) supplies the confident, slightly formal "printed ticket" headline voice; Inter carries every working number, label, and control so the app still reads fast and legibly where it needs to be a tool, not a souvenir.

The system stays warm and reassuring on purpose: this app tracks families' vacation money, so its surfaces avoid anything cold, alarmist, or spreadsheet-like. Cards are soft-cornered and lightly lifted rather than bordered and flat; the one recurring "stamped" motif — a solid navy block used for hero/summary data (countdown, budget totals) — is the closest thing to a signature device, echoing a ticket's ink-stamped panel.

**Key Characteristics:**
- Warm cream paper background, never stark white as the page ground
- Navy ink for headlines and the one deep "stamped" surface (hero blocks)
- Gold as the primary call-to-action color; sky blue as the everyday interactive/link color
- Coral and teal reserved for alert/success semantics only, never decoration
- Fraunces serif for numbers and headlines that deserve weight; Inter for everything functional
- Soft, generous corner radii and quiet shadows — depth is gentle, never dramatic

## Colors

Warm and restrained: one ink (navy), one paper (cream), one accent pair (sky for interaction, gold for commitment/action), and two semantic colors (coral, teal) used sparingly.

### Primary
- **Sky** (`#2A6FE0`, hover `#1E5AC4`): the everyday interactive color — links, active nav states, selected states, informational icon tiles. This is what most of the UI's "aliveness" runs on.
- **Gold** (`#F5B536`, hover/deep `#C68A12`, text-on-gold-tint `#8a5a00`, text-on-solid-gold `#3d2900`): reserved for the highest-commitment action on a screen (primary form submit, the "book/confirm" button) and for upsell/upgrade affordances. In-app buttons pair gold with navy text; the marketing site's own gold button/badges use the darker `gold-ink` instead — both are ticket-stamp contrast choices, just calibrated for their surface. `gold-dark` is for icons/accents on light surfaces; small text sitting on a gold-*tinted* surface (badges, "Soon"/upgrade pills) uses `gold-text`; text or icons sitting directly on *solid, full-opacity* gold (marketing buttons, step-number badges) uses the even darker `gold-ink` for AA contrast against the brighter surface.

### Secondary
- **Night / Navy Ink** (`#0D2340`, card variant `#132B4D`): headline color, and the solid surface color for hero/summary blocks (dashboard countdown + budget panel). It is the system's one deliberately dark surface.

### Tertiary
- **Teal** (`#2CA58D` / deep `#1B7D68`) and **Coral** (`#E0533F`, small-text tone `--coral-text` `#c03a2b` — parallel to `gold-text`, used where coral sits behind small badge/pill text on a coral-tinted fill for AA contrast): status pair. Teal = positive/on-track/success (empty-state icons, confirmation notices, "good" badges). Coral = urgency/attention/error (overdue reminders, destructive/error text, warning badges). Neither appears as a structural or decorative color — only as a semantic signal.
- **Catalog tag tones** (`--violet-dark` `#6b4c9a` / `--violet-bg`, `--sunset-dark` `#a15100` / `--sunset-bg`, `--steel-bg` paired with `--sky-dark`): a small, non-semantic tag palette reserved for catalog/entry-type pills (character, booth/location, festival tags on Wishlist/CatalogGrid/EntryCard) where several distinct categories need visual differentiation on the same row. Unlike the Semantic-Only Rule pair, these don't signal status — they're a categorical accent, scoped to catalog tag pills only.

### Neutral
- **Cream** (`#F0EDE8`, page background) and **Cream Light** (`#FFF6E7`): the paper-stock ground. `bg` (`#F3EEE3`) is a near-identical warm neutral used interchangeably as a secondary surface tint.
- **White** (`#FFFFFF`): card and sheet surfaces sit on white against the cream page, giving the "ticket laid on the table" separation.
- **Ink** (`#20242C`): primary body text color (distinct from navy, which is reserved for headline/brand use).
- **Border** (`rgba(13,35,64,.28)`) / **Border Light** (`rgba(13,35,64,.1)`): borders are always a translucent tint of navy, never a flat gray, so they stay warm. **Border on Dark** (`rgba(255,255,255,.1)`) is Border Light's counterpart for navy/dark surfaces — faint dividers, progress tracks, and badge fills on the hero block and similar dark cards use this instead of a raw white-alpha value.
- Text runs on a three-step navy-tint ladder: primary ink (`#20242C`), secondary (`rgba(13,35,64,.6)`), tertiary (`rgba(13,35,64,.42)`) — no separate gray scale.
- **Ink Wash** (`--ink-wash`, `rgba(13,20,32,.06)`): a faint neutral fill for muted/inactive states — a depleted gift-card icon, a small ID/method pill — distinct from `border-light` (which is for borders and structural dividers, not surface fills).
- **Header Glass** (`rgba(240,237,232,.85)`): the sticky/frosted header background — same warmth as Cream, translucent so the backdrop-blur shows through. Used on every sticky nav/header surface (app shell header, marketing nav, auth header, paywall header).

### Exceptions
**Print output.** `BudgetPrintView` targets a physical printout, not a screen, so it uses its own small palette (`#F8F7F5` page tint, `#c03a2b`/`#8a3226` deep coral for printed emphasis) calibrated for ink-on-paper contrast rather than the on-screen token set — an intentional, scoped exception, not drift.

### Named Rules
**The One Ink Rule.** Every border, secondary text tone, and shadow color derives from navy at reduced opacity — never introduce a neutral gray. Warmth comes from staying inside one hue family for "structure" colors.

**The Semantic-Only Rule.** Coral and teal appear only to mean something (error/urgent vs. success/positive). If a color choice is purely decorative, it must be sky, gold, or a neutral — never coral or teal.

## Typography

**Display Font:** Fraunces (with Georgia, serif fallback)
**Body Font:** Inter (with system-ui, sans-serif fallback)

**Character:** A formal, slightly editorial serif for anything that should feel like a printed headline or a "big number" (countdown days, dollar totals, page headlines), paired with a clean, highly legible grotesque for every control, label, and paragraph of working UI.

### Hierarchy
- **Display** (400, 28–40px, line-height 1): hero numbers — countdown day count, large budget totals on the navy hero block.
- **Headline** (400, 23–28px, line-height 1.05–1.3): page/card headlines (`h1–h3`, auth headline, empty-state headline). Always navy, never bold — weight comes from the serif itself, not font-weight.
- **Title** (600, 13–15px): card titles, row/list-item names, header wordmarks in compact chrome (e.g. the account-avatar initial) — Inter, semibold, ink- or navy-colored. Denser contexts (a card header inside another card, a nav-drawer trip name) sit at the low end; standalone card titles sit at 15px.
- **Value** (400, 16–20px, Fraunces): compact numeric/currency displays inside rows, chips, and stat blocks (a budget row's amount, a day chip's date number, a stat block's dollar figure) — smaller than Headline, but still a "this number matters" moment, so it stays in the serif.
- **Body** (400, 14–15px, line-height 150%): paragraphs, form values, general content.
- **Secondary** (500, matches the size of the role it modifies): the missing middle step between Body's 400 and every other role's 600 — metadata that reads as more than throwaway detail but isn't a title (a card's secondary action link, a row's inline sub-value). Use sparingly and only where a role would otherwise sit at 600 by default rather than by genuine emphasis; most metadata/hint text stays at Body's plain 400.
- **Button** (600, 13.5px): the compact tier for button/action labels and dense form inputs — sits just under Body since buttons carry less reading weight than paragraph text (a sheet's primary "Save"/"Add" button, a text input's typed value).
- **Label** (600, 10–12.5px, often uppercase with ~0.06–0.1em tracking): field labels, section eyebrows, badges, nav sub-labels.
- **Micro** (600, 9px, uppercase, ~0.06–0.1em tracking): the smallest eyebrow tier — used only for compact stat labels and secondary metadata rows where even Label reads too large (a stat block's "PLANNED"/"SPENT" caption, a day-chip's weekday). Never used for anything a user needs to read comfortably at a glance from a distance.

### Named Rules
**The Serif-Is-a-Number Rule.** Fraunces is reserved for headlines and quantities that deserve visual weight (dates, dollar amounts, page titles) — it never appears in body copy, buttons, or form fields.

**The Icon Glyph Exception.** Icon font (`<i class="ti ...">`) sizes follow their component's density and touch-target needs (roughly 11–20px), not the text ramp above — a tab-bar icon, a chevron, and a drag handle are sized to their own container, not to a paragraph's type scale.

**The Persuade-Scale Exception.** The Hierarchy above is calibrated to the app's Operate-mode density. The marketing homepage (Persuade mode) earns a larger, independent hero/section-heading scale (h1 ≈50px, section h2s ≈30–38px, sub-headings ≈21–22px) so it can carry a landing page's visual weight — these sizes are intentional and specific to Persuade surfaces, not a drift from the in-app Display range.

**The Emphasis-Number Rule.** Inter's weight range tops out at 600 almost everywhere on purpose — 700 is reserved for the single most important figure in a dense, multi-number view (an over-budget actual-spend amount in an expense row, a totals row in a table) so it stays a genuine standout rather than a default. Fraunces numbers never take this treatment; per the Serif-Is-a-Number Rule they stay 400 always, since the serif itself carries the weight.

**The Tabular Numbers Rule.** Every Inter numeral on the site renders with `font-variant-numeric: tabular-nums` (set globally in `index.css`) so digits hold a fixed width — aligned currency columns, countdown/day figures, and any place two numbers stack visually stay steady instead of jittering with proportional figures.

## Layout

Single-column, card-stacked mobile layout that becomes a two-column masonry-style card grid plus a persistent left nav drawer at desktop (≥1024px); a fixed bottom tab bar is the primary mobile nav and disappears at that same breakpoint. Content width is capped and centered: 480px (mobile), 620px (≥640px), 1180px (≥1024px, shared between the nav drawer and the two-column card area). Desktop's two card columns are independent flex columns (not a CSS grid) so uneven card heights pack tightly instead of leaving a shared-row gap. Spacing is compact and consistent: ~16–18px page gutters, ~12–16px between stacked elements, 8–14px internal padding inside compact rows/chips.

## Elevation & Depth

Mostly flat, tonal system — depth is conveyed by white-on-cream surface contrast more than by shadow. Shadows exist but stay soft and are used sparingly, mainly on overlays (menus, sheets, toasts) and card resting states, never as a heavy drop-shadow effect.

### Shadow Vocabulary
- **shadow-sm** (`0 1px 3px rgba(13,35,64,.05)`): default resting card/surface edge.
- **shadow** (`0 4px 18px rgba(13,35,64,.1)`): hover states, small floating elements (e.g. social/link buttons on hover).
- **shadow-card** (`0 1px 2px rgba(13,35,64,.06), 0 8px 24px -12px rgba(13,35,64,.12)`): standard elevated card.
- **shadow-panel** (`0 20px 40px -12px rgba(13,35,64,.25)`): overlays that sit above content — user menu, toast, bottom sheet.

### Named Rules
**The Quiet Shadow Rule.** Shadows are always soft, diffuse, and navy-tinted (never black) — depth should feel like paper lifted slightly off a table, not like a UI panel floating in space.

## Shapes

Consistently soft-cornered: an 11px default radius (`--radius`), 8px for the tightest controls (`--radius-sm`: small chips, compact inputs), 10px for the next tier up (`--radius-md`: sheet icon buttons, catalog card icons, form fields, small action buttons — the most common single radius in the app), 16–20px for cards and sheets, and full pill radius for badges, tags, and the FAB. Corners get more generous as a surface gets larger (input < button < card < sheet), which is the system's implicit corner-scale rule. Borders, where present, are always the translucent navy `border`/`border-light` tokens rather than a hard black or gray line; many surfaces (hero blocks, cards) skip borders entirely and rely on the cream/white contrast instead.

## Components

Buttons, cards, and the navy hero block are warm and reassuring: soft radii, gentle motion (opacity/background fades, not sharp transforms), and confident but limited color use.

### Buttons
- **Shape:** 11px radius (`--radius`), full-width in forms.
- **Primary:** gold background (`#F5B536`) with navy text (`#0D2340`), 13px padding, 600 weight — the "ticket stamp" button, reserved for the single highest-commitment action per screen.
- **Secondary:** white background, 1.5px navy-tinted border, ink text — used for equal-weight alternate actions (e.g. "Continue with Google").
- **Tertiary/Ghost text button:** no background/border, sky-colored text, used for links and low-emphasis actions (e.g. "forgot password," toggle links).
- **Hover / Focus:** primary darkens slightly (opacity 0.9) or shifts to `sky-dark`/`gold-dark`; secondary buttons gain a sky-tinted border and a faint sky background wash; focus rings are not heavily styled beyond browser default outline plus `outline-offset`.
- **Disabled:** opacity 0.6, `cursor: not-allowed`.

### Badges
- **Style:** pill radius, small (11.5–12px) 600-weight text, tinted background matching the semantic color at ~15–20% opacity (teal/gold/coral variants), text in the corresponding `-dark` tone.
- **State:** informational only — no interactive/selected state; badges are status labels, not filters.

### Cards / Containers
- **Corner Style:** 14–16px radius.
- **Background:** white on the cream page ground; the "hero" variant uses solid navy (`night`) instead, for the one summary block per page (dashboard countdown/budget).
- **Shadow Strategy:** shadow-sm at rest; borders (`border-light`) more often carry the separation than shadow does.
- **Border:** 1px `border`/`border-light`, frequently used alongside or instead of shadow.
- **Internal Padding:** ~14–16px header padding, 12–16px row padding, 20–32px for standalone content cards (e.g. auth card).

### Inputs / Fields
- **Style:** white background, 1.5px navy-tinted border, 8px radius (tighter than cards), 11–13px padding.
- **Focus:** border shifts to sky blue; no glow/ring.
- **Error / Disabled:** error text and inline error banners use coral on a coral-tinted background; disabled controls drop to 0.6 opacity.

### Navigation
- **Mobile:** fixed bottom tab bar, icon + 10px label, tertiary-gray icons that turn sky blue + semibold label when active.
- **Desktop:** static 252px left drawer (sticky, scrollable) replacing the tab bar; nav items are full-width rows with an icon, label, and optional trailing badge/"soon" pill, sky-tinted background wash on hover/active.
- **Header:** fixed, frosted-glass (cream at 85% opacity + backdrop blur) top bar with the wordmark (Fraunces) and a circular account-avatar trigger opening a small navy-bordered dropdown menu.

### Floating Action Button (signature component)
A 52px sky-blue circular button fixed bottom-right (above the tab bar on mobile), white icon, soft blue-tinted shadow (`0 4px 14px rgba(42,111,224,.4)`) — the system's one strongly-colored floating element, reserved for primary "add" actions.

## Do's and Don'ts

### Do:
- **Do** keep the page ground warm cream, never pure white or gray — white is reserved for cards/surfaces sitting on top of the page.
- **Do** use gold only for the single primary/commitment action on a screen; a screen with two gold buttons has lost the ticket-stamp effect.
- **Do** use Fraunces only for headlines and standalone numeric quantities, never for UI chrome, labels, or body copy.
- **Do** derive borders and secondary text from navy at reduced opacity, keeping the whole neutral system warm.
- **Do** keep shadows soft and navy-tinted; treat the flat/bordered look as the default and shadow as a rare accent.

### Don't:
- **Don't** use coral or teal decoratively — they carry error/urgent and success/positive meaning only.
- **Don't** introduce a plain gray for borders, dividers, or muted text; use the navy-tint ladder instead.
- **Don't** use Disney trademarks, character likenesses, or proprietary Disney marks/fonts anywhere in the visual system (product constraint, not a stylistic preference).
- **Don't** treat the standalone HTML files in `public/` (configurator, estimator, planner, pricing, account, home prototypes) as authoritative — they are earlier/exploratory iterations; the tokens and components above are extracted from the live `src/` app.
