---
target: Dashboard
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Dashboard.jsx"
target_fingerprint: "sha256:44455a6c7279dc1ed0d9f9f7165c5f91fce806cf2921e1ba56cda7f9d03be9b6"
target_path: "C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Dashboard.jsx"
timestamp: 2026-09-04T15-22-27Z
slug: src-pages-dashboard-jsx
closed: true
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading skeleton covers fetch; no feedback on drag-reorder persistence (silent localStorage write) |
| 2 | Match System / Real World | 3 | Domain vocabulary ("park day," "resort package") and celebratory 🎉 at trip-day are apt and specific |
| 3 | User Control and Freedom | 3 | Reorder gives real control, but no undo for a mis-drag and no way to hide/collapse a card |
| 4 | Consistency and Standards | 2 | Hero "Spent" stat contradicts the file's own documented badge-tone contract; two navy hero surfaces on one screen |
| 5 | Error Prevention | 2 | Fetch error renders as a bare unstyled sentence with no retry; reorder has no undo guard |
| 6 | Recognition Rather Than Recall | 3 | Icon+label+sub pattern is consistent and scannable across all cards |
| 7 | Flexibility and Efficiency | 2 | Drag-reorder rewards power users but has no keyboard equivalent, bulk action, or pin/collapse |
| 8 | Aesthetic and Minimalist Design | 2 | Urgency strip + navy hero + navy TodayCard header stack three "important" zones before any card content |
| 9 | Error Recovery | 1 | Sole error path is a raw message string, no recovery action, can render above stale/zeroed hero numbers |
| 10 | Help and Documentation | 2 | No first-use hint for drag-to-reorder; users must discover the grip icon unaided |
| **Total** | | **23/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**LLM assessment:** Domain-specific in vocabulary and content — "park day," "resort package," a countdown that flips to "🎉 you're at Disney!" — this is clearly authored for a Disney trip planner, not a relabeled generic dashboard. But the structural vocabulary underneath is a standard SaaS pattern: KPI hero strip, reorderable icon+title+row card grid, pill badges, floating add button. DESIGN.md's "Park Ticket" concept survives mainly as the navy hero block and Fraunces numerals — no other screen element (cards, badges, itinerary chips) carries a ticket-specific visual device (no stub/perforation motif, no stamp treatment). The hero block is carrying nearly the entire "this isn't a spreadsheet" burden alone, and it isn't even the only navy surface on the page (see P2).

**Deterministic scan:** `detect.mjs` returned exit code 2 with ~70 findings across the Dashboard + its supporting components: 51 `design-system-font-size` and 12 `design-system-radius` advisories, 6 `design-system-color` advisories, and 1 `layout-transition` warning (`ProgressBar.module.css:2`, `transition: width` — a real layout-thrash antipattern). Most of the font-size/radius hits are **false positives**: the detector checks against discrete tokens, but DESIGN.md documents type and the card-radius rule as *ranges* (Label 10–12.5px, Body 14–15px, Headline 23–28px, Display 28–40px, cards 14–16px per prose) — values like 10/11/12/14/24/28/40px sit inside those documented bands. There is a genuine internal inconsistency worth fixing in DESIGN.md itself: the frontmatter `rounded` scale (8/11/16/20/999) doesn't include the 14px the prose Card spec calls out, which is what triggers those particular radius "violations." Real drift does exist in the dead zones between documented steps — 13px, 13.5px, 16–20px, 17px, 18.5px, 19px, and a few sub-8px radii (6px, 9px, 10px, 12px with no matching token) are genuine ramp gaps, not false positives. Two color near-misses are also real: `#8a5a00` (hardcoded 3×, close to but not equal to `gold-dark` `#C68A12`) and `rgba(30,42,68,*)` (hand-typed 3×, a near-miss of the actual navy token `rgba(13,35,64,*)`).

**Visual overlays:** No injected overlay script was run against the live page. Browser evidence for the authenticated Dashboard was obtained via direct screenshot/read_page/console inspection instead (see Assessment B) — a working Browser-pane session was already authenticated against the local dev server, so this was read-only observation, not sign-in performed by either assessment.

## Overall Impression

The Dashboard is well-constructed at the component level — the `DashboardCard` contract, the merged countdown/budget hero, and the independent-flex-column layout are all genuine craft decisions with code comments showing the intent was deliberate. But three things undercut it: a hardcoded semantic-color bug that paints the app's most-viewed number as a permanent alarm, a real React key-prop antipattern sitting directly under the one feature (drag-reorder) most likely to expose it, and an interaction layer (rows, "View all," drag handles) that's effectively invisible to keyboard and screen-reader users. The single biggest opportunity: fix the "Spent" color contract — it's a one-line change that directly serves the product's own stated "warm and reassuring" positioning, on the highest-traffic screen in the app.

## What's Working

1. **The merged countdown + budget hero** collapses two potential panels into one navy focal block, explicitly commented in code as intentional ("one navy surface, one set of numbers") — a strong, correct execution of DESIGN.md's "one hero per page" rule.
2. **`DashboardCard`'s reusable anatomy** enforces icon tile + title/sub + "View all" + optional drag handle across five structurally different data types (itinerary, reminders, payments, gifts, budget) without per-card visual drift.
3. **Independent flex columns instead of CSS grid** (`.cardCols`/`.cardCol`, commented in `Dashboard.module.css`) deliberately avoids the shared-row-height problem a naive grid would create — a small but genuine craft decision for the reorderable layout.

## Priority Issues

**[P0] Hero "Spent" stat is hardcoded to the alert color regardless of budget status**
- **Why it matters:** `Dashboard.jsx:457` sets `color: 'var(--coral)'` unconditionally on the "Spent" figure, two lines below a comment in the same file stating the badge-tone contract ("coral = over budget/urgent only"). This is the single most-viewed number on the highest-traffic screen of a family-money app, and it renders as an alarm on every visit — including trips that are comfortably on-budget — directly contradicting DESIGN.md's "Semantic-Only Rule" and the product's stated "warm and reassuring" intent.
- **Fix:** Default "Spent" to ink/white; switch to coral only when `spent > budgeted`, mirroring the `over` logic already used correctly for per-category rows at line 411.
- **Suggested command:** `/impeccable colorize`

**[P1] React `key` passed via object spread on every reorderable card — console-verified, risks state loss during drag**
- **Why it matters:** `Dashboard.jsx:233–240` builds `sortProps(id)` returning `{ key: id, cardRef, style, dragHandleProps }`, then spreads the whole object onto `<DashboardCard>` at five call sites (lines 252, 291, 322, 360, 403). React logged a real console warning for this on the live page ("a props object containing a 'key' prop is being spread") — `key` isn't applied through spread, meaning React may not track card identity correctly through reorders, which is exactly the feature this object exists to support.
- **Fix:** Extract `key` explicitly at each call site (`<DashboardCard key={id} {...sortProps(id)}>`) instead of spreading it.
- **Suggested command:** `/impeccable harden`

**[P1] Card interactions are pointer-only: unfocusable, unlabeled, and under the touch-target minimum**
- **Why it matters:** `.row`, `.dayCard`, `.urgencyStrip`, TodayCard's `.card`, and `DashboardCard`'s "View all" are all `<div onClick>` with no `role`, `tabIndex`, or keyboard handler; confirmed live via `read_page` — the drag handle and every "View all" control were absent from the interactive-elements accessibility tree despite being visibly clickable. The drag-reorder system (`useSortableCards.js`) is built entirely on pointer events with no keyboard alternative. The drag handle's effective hit area is ~30×30px (`width/height: 22px` plus a `-4px` margin), under the 44×44px touch-target guideline, and "View all" has no padding/min-height beyond its 13.5px text line.
- **Fix:** Convert clickable divs to `<button>`/`<Link>` semantics (or add `role="button" tabIndex={0}` plus Enter/Space handling); add a keyboard-operable reorder path (move-up/move-down buttons, or arrow-key handling while a drag handle has focus); enlarge the drag-handle hit area to 44×44px.
- **Suggested command:** `/impeccable harden`

**[P2] Two navy "hero" surfaces stack on one screen, diluting the system's one signature device**
- **Why it matters:** Both the countdown/budget hero (`Dashboard.module.css:76`) and `TodayCard`'s header (`TodayCard.module.css:10`) render solid navy simultaneously, against DESIGN.md's explicit rule that navy is "the system's one deliberately dark surface... for the one summary block per page." Combined with the coral urgency strip directly above both, the page can open with three separate high-contrast "important" zones before any card content appears, undercutting the hierarchy the hero is supposed to establish.
- **Fix:** Restyle `TodayCard`'s header to a lighter accent treatment (cream/gold-tinted top bar) and reserve navy exclusively for the countdown/budget hero.
- **Suggested command:** `/impeccable distill`

**[P3] Primary CTA buttons use sky blue instead of the documented gold primary style**
- **Why it matters:** `.planBtn` (`Dashboard.module.css:41–52`) styles both the empty-state "Plan a trip" CTA and the upgrade/paywall CTA with `background: var(--sky)`, while DESIGN.md specifies gold-bg/navy-text as the primary button and explicitly calls out gold for "upsell/upgrade affordances." `AppShell.module.css`'s own `.navUpgradeBtn` (line 113) correctly uses the gold treatment for the identical "upgrade" concept — so the dashboard contradicts its own nav drawer, and the single highest-commitment action on an empty dashboard loses the "ticket stamp" moment DESIGN.md reserves for it.
- **Fix:** Restyle `.planBtn` to the gold primary-button token to match DESIGN.md and `AppShell`'s `navUpgradeBtn`.
- **Suggested command:** `/impeccable adapt`

## Persona Red Flags

**Sam (Accessibility)**: Every list-row and TodayCard is an unfocusable, unlabeled `<div onClick>` — confirmed absent from the live accessibility tree. `useSortableCards.js` reorder is 100% pointer-only with no keyboard fallback. `Fab.jsx` gives its button only a `title` attribute, not `aria-label` (inconsistent screen-reader support). `AppShell.jsx`'s account-avatar trigger has no `aria-label` — a screen reader announces only the user's initial letter. Icon-font `<i>` tags appear throughout with no `aria-hidden="true"`.

**Riley (Stress Tester)**: The hero's "Spent" number never changes color regardless of budget state — a pass toggling over/under-budget trips would immediately expose that the tone system isn't wired up for this one number. The sole error path is a bare sentence with no retry, and can render above a hero still showing stale/zeroed numbers. Card order is keyed to `pkd_dash_cols_${userId}` in `localStorage`, so clearing site data, a private window, or a new browser silently resets a deliberately arranged dashboard back to defaults with no notice.

**Casey (Mobile)**: `interleaveColumns` re-linearizes the two desktop columns by alternating them for the single mobile column, so a card dragged to a specific spot on desktop lands in a different position on mobile — breaking the "I already put this where I want it" expectation across devices. The drag-handle hit target (~30×30px effective) is small for a thumb gesture, and the mobile page stacks urgency strip → hero → TodayCard → up to 5 full cards with no collapse option.

## Minor Observations

- `ProgressBar`'s dark-track handling (translucent white on navy vs. `border-light` on white) correctly adapts to both surfaces it's used on.
- Fraunces is applied consistently to every "big number" per the Serif-Is-a-Number Rule — good adherence.
- The countdown's non-numeric states (`'🎉'`, `'✓'`) share the same Fraunces numeral slot as digits — likely fine visually, but a slightly odd content-type mix for a slot styled specifically for quantities.
- `#8a5a00` (gold-badge text) and `rgba(30,42,68,*)` (near-navy) are each hand-typed 3× across files rather than referencing a token — low risk today, but drift-prone if the palette is retuned later.
- The reminders card's icon tile is hardcoded coral regardless of whether any reminder is actually urgent — a milder, secondary instance of coral representing a category rather than a live status.
- The drag-in-progress opacity treatment (0.35 on the dragged card) is a nice, subtle piece of direct-manipulation feedback.

## Questions to Consider

1. If "Spent" renders in the alert color on every visit regardless of actual budget status, what is coral communicating on this screen — and does that match how a parent checking their Disney budget the night before a payment is due should feel?
2. DESIGN.md stakes the app's differentiation on "one navy hero per page" — now that `TodayCard` also renders a navy header on the same screen, is the dashboard signaling two different "important" surfaces, or diluting the one device that keeps this app from looking like a generic fintech dashboard?
3. Card order is currently a per-browser, mouse/touch-only preference with no keyboard path — for a collaborative family-planning product, would a well-considered fixed default (with reordering as an optional, fully keyboard-accessible power feature) serve first-time and accessibility-limited users better than the current setup?
