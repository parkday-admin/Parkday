---
target: Budget
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Budget.jsx"
target_fingerprint: "sha256:900286782917923ced1ff011752fee7e639247076e6d51d69e6b5dd9d897dfd7"
target_path: "C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Budget.jsx"
timestamp: 2026-09-04T20-13-33Z
slug: src-pages-budget-jsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton loading, live progress bar, save/delete toasts; no inline "saving…" state on the tap-to-edit budget field |
| 2 | Match System / Real World | 3 | Real Disney vocabulary (Lightning Lane Multi/Single/Premier Pass, park-day scoping) matches how trips are actually planned |
| 3 | User Control and Freedom | 3 | Inline budget edit, 5s undo toast on delete; no confirm-before-delete, relies entirely on the undo window |
| 4 | Consistency and Standards | 2 | Internally consistent, but structurally violates DESIGN.md's own Semantic-Only Rule (coral used decoratively) |
| 5 | Error Prevention | 3 | `min="0"` on numeric inputs, required-amount validation with inline error |
| 6 | Recognition Rather Than Recall | 3 | Icon+label+color per category aids scanning; payment-source dropdown remembers prior entries |
| 7 | Flexibility and Efficiency | 3 | Filter by category/day/payment, PDF export, quick inline budget edit |
| 8 | Aesthetic and Minimalist Design | 2 | Hero (8 numbers) + every category's full breakdown render simultaneously — dense, spreadsheet-like |
| 9 | Error Recovery | 3 | Inline error text and toasts exist; error copy is generic but functional |
| 10 | Help and Documentation | 1 | No explanation anywhere of what Budgeted vs. Planned vs. Actual/Spent mean |
| **Total** | | **27/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**LLM assessment:** A hybrid. The *data model* is genuinely Disney-specific — Lightning Lane rows carry real Multi/Single/Premier Pass sub-types, `categoriesForTrip` correctly collapses Resort+Tickets into "Resort Package" for package bookings, and the CategoryDetail drill-down surfaces real venues ("Boatwright's Dining Hall," "Gaston's Tavern - Cinnamon Roll") with Fantasyland/Adventureland location tags. But the *screen mechanics* — hero with a progress bar and 4-stat footer, category cards with mini progress bars and "% spent" captions, a filter sheet with chips — is the exact pattern any Mint/YNAB-style app would ship. Strip the category icons and Disney copy and this is a standard budget-tracker skeleton; the specificity lives in the data, not the interaction design.

**Deterministic scan:** `detect.mjs` returned 12 findings (exit 2) across the 6 scanned files: 1 `side-tab` warning (`Budget.module.css:12`, `.staleBanner`'s left border — flagged as "the most recognizable tell of AI-generated UIs"), 1 `layout-transition` warning (`.heroBarFill { transition: width }`, a layout-thrash antipattern), 5 `design-system-radius` advisories (9px/10px/2px/6px values with no DESIGN.md exception covering them), and 5 `design-system-font-size` advisories. Two of the font-size findings are false positives already covered by documented exceptions (34px hero number sits in the Display tier; 9.5px `.summaryLbl` is a rounding-level match for the documented 9px Micro tier, whose own example is literally a stat block's "PLANNED"/"SPENT" caption). The remaining three 13.5px instances fall in a genuine gap between the Label tier's 12.5px ceiling and Body's 14px floor — real, low-severity drift. Notably, the live page also shows the same `side-tab` border pattern on `EntryCard` rows in the category drill-down — a component outside this scan's file list, worth a follow-up pass.

**Visual overlays:** No injected overlay; evidence came from direct screenshot, accessibility-tree, and keyboard-navigation testing on the live authenticated page (desktop + mobile), plus a CategoryDetail drill-down.

## Overall Impression

The page's data foundation is genuinely product-specific and its signature navy hero is executed exactly per spec — but the screen inherits the exact anti-pattern already fixed on the Dashboard and TodayCard earlier this session: a hardcoded-coral "Spent" stat, this time compounded by a deeper structural version where three whole categories (Dining, Snacks, Souvenirs) are permanently branded coral for decoration, which silently disables the over-budget warning for them. Layered on top, every category row and the tap-to-edit budget trigger are non-semantic `<div>`s — confirmed, live, completely unreachable by keyboard and absent from the accessibility tree. For a page a family checks repeatedly as trip spending happens, both issues cut against DESIGN.md's explicit "warm and reassuring" mandate and basic operability.

## What's Working

1. **The navy hero block** ([Budget.jsx:234-258](src/pages/Budget.jsx:234)) — a correct, singular application of DESIGN.md's signature "stamped" device: solid navy, gold headline figure, one per page, exactly as specified.
2. **Real domain modeling** — `categoriesForTrip` collapsing Resort+Tickets for package bookings, Lightning Lane's real pass sub-types, and CategoryDetail's specific Disney dining venues with location tags are where the product's stated positioning actually shows up.
3. **Thoughtful micro-interactions** — tap-to-edit inline budget with a dashed-underline affordance, a 5-second undo toast that restores the exact deleted entry, and a "budget targets carried over from a duplicated trip" staleness banner that acknowledges a real Disney-pricing problem (prices change year to year).

## Priority Issues

**[P0] Coral is used decoratively and structurally, contradicting DESIGN.md's own Semantic-Only Rule — and silently breaks the over-budget signal**
- **Why it matters:** `categories.js:6,7,10` permanently colors Dining/Snacks/Souvenirs coral as a brand choice, and [Budget.jsx:254](src/pages/Budget.jsx:254) hardcodes the hero's "Spent" stat to coral regardless of budget status — the exact pattern already fixed on the Dashboard and TodayCard hero this session. Live-verified at 59% spent (well under budget), the number still renders in the same alarm-red used for errors. Worse, since the over-budget cue is `over ? 'var(--coral)' : meta.prog`, and `meta.prog` is *already* coral for those 3 categories, going over budget in Dining, Snacks, or Souvenirs produces **no visible change at all** — a real functional bug, not just a tone problem.
- **Fix:** Reassign Dining/Snacks/Souvenirs to non-alert hues; default "Spent" to ink/neutral and reserve coral strictly for the `over` boolean.
- **Suggested command:** `/impeccable colorize`

**[P1] Category rows and budget-edit triggers are keyboard-unreachable — confirmed live**
- **Why it matters:** [Budget.jsx:267](src/pages/Budget.jsx:267) (category row), [Budget.jsx:287](src/pages/Budget.jsx:287) (tap-to-edit budget), and [CategoryDetail.jsx:114](src/pages/CategoryDetail.jsx:114) are all `<div onClick>` with no role/tabIndex/keyboard handler. This isn't a source-only read: live keyboard testing confirmed Tab skips all 8 category rows entirely (jumping straight from Export PDF to the FAB), and none of them appear in the accessibility tree. The same was confirmed on CategoryDetail's entry rows. A keyboard-only user cannot open a single category or edit a single budget on this page.
- **Fix:** Convert to `<button>`/`<Link>` semantics or add `role="button" tabIndex={0}` plus Enter/Space handling, matching the fix already applied to Dashboard's card rows this session.
- **Suggested command:** `/impeccable harden`

**[P1] Cognitive overload: every category's full breakdown renders at once, with no per-category "remaining" figure**
- **Why it matters:** The Summary tab surfaces the hero's 8 numbers plus 9-10 category cards each showing 4+ live numbers simultaneously, with no pacing or progressive disclosure — confirmed live on both desktop and mobile. Meanwhile neither the category row nor CategoryDetail's summary strip computes "remaining," even though the trip-level hero already does — forcing mental subtraction for the one number a family actually wants ("how much do I have left for dining?").
- **Fix:** Add a computed `remaining = budgeted - actual` to `categoryTotals()` and surface it at both the row and CategoryDetail level; consider a condensed default row (icon/name/%/remaining) with tap-to-expand for the rest.
- **Suggested command:** `/impeccable distill`

**[P2] Progress bars carry no accessible value semantics**
- **Why it matters:** `.heroBarFill`/`.catProgFill` are plain `<div style={{width}}>` elements with no `role="progressbar"` or `aria-valuenow`/min/max. Sighted users aren't blocked (the percentage is also shown as text), but a screen reader gets no indication a progress indicator exists at all.
- **Fix:** Add `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax` (or an equivalent accessible name) to both the hero and per-category bars.
- **Suggested command:** `/impeccable harden`

**[P3] Detector-flagged quality/hygiene issues**
- **Why it matters:** The `side-tab` antipattern (a thick colored left border on `.staleBanner`, explicitly flagged by the detector as "the most recognizable tell of AI-generated UIs") also appears live on `EntryCard` rows outside this scan's file set. `.heroBarFill`'s `transition: width` is a layout-thrashing animation pattern. Icon-only buttons (delete, copy-planned-to-actual, dismiss banner) use `title` instead of `aria-label` — a weaker accessible-name fallback with no touch tooltip.
- **Fix:** Restyle `.staleBanner` (and audit `EntryCard.module.css` for the same pattern) off the side-border treatment; switch the width transition to `transform: scaleX()`; add `aria-label` to the three icon-only buttons.
- **Suggested command:** `/impeccable audit`

## Persona Red Flags

**Sam (Accessibility)**: Category rows and budget-edit triggers are `<div onClick>` — confirmed absent from the live accessibility tree and unreachable by Tab. The pencil edit-affordance icon is 9px at 40% opacity. Selected-state filter/category pills are encoded purely by color/border tint with no icon or checkmark — live-confirmed on the ExpenseSheet's coral-selected "Dining" pill, visually indistinguishable from an error treatment for low-vision users. Toast notifications appear to be plain fixed divs with no `aria-live` region.

**Riley (Stress Tester)**: The category row has two overlapping tap targets — the whole row navigates to CategoryDetail while the budget figure stops propagation for inline editing — on tight 12-14px row padding, risking mis-taps for a user editing several budgets quickly. With 9-10 categories and no sort/filter by "over budget," a mid-trip health check requires scanning the entire grid to find problem categories.

**Casey (Mobile)**: The filter sheet (Category + Day + Payment chips) becomes a single scroll of 20-30+ tappable pills on a 375px viewport — the cognitive-load issue felt most acutely here. The FAB sits directly adjacent to the last category card with the tab bar close behind, a tight stack of floating elements in one corner.

## Minor Observations

- `fmt()` rounds every dollar amount to the nearest whole dollar at display time; `categoryTotals()` sums exact values, so rounding drift is possible across many small entries.
- "Resort Package"'s subtext wraps awkwardly to two lines on the desktop 2-column grid in the live screenshot.
- `.exportBtn`'s icon-only fallback under 380px width is a reasonable, deliberate responsive degradation.
- The stale-budget banner's gold-left-border-on-cream treatment is a well-calibrated "cautionary but warm" pattern — ironically the same "side-tab" shape the detector flags as a slop tell, but here it's restrained (thin, single instance, gold not saturated) and worth using as the template for other cautionary states instead of jumping straight to coral.
- ExpenseSheet's category pill reuses each category's own `meta.color` for its selected state — meaning a selected Dining pill and an error-state treatment both read as coral-bordered, overloading one color signal for two meanings.

## Questions to Consider

1. If "Spent" renders coral regardless of budget status, and that's now the second hero (after Dashboard) found doing this — is there a shared component or convention worth extracting so this bug class stops recurring page by page?
2. `categories.js` permanently brands three categories coral as a decorative choice — was that decided before the Semantic-Only Rule was written into DESIGN.md? Does the doc need to bend to the code, or does the code need to catch up to the doc it claims to follow?
3. The page asks users to mentally subtract budgeted-minus-spent at every level except the trip total, which already does that math in the hero — was omitting "remaining" per category a deliberate simplification, or an oversight worth fixing everywhere the hero already sets the expectation?
