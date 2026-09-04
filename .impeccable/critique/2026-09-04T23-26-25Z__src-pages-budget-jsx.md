---
target: the budget page
total_score: 24
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Budget.jsx"
target_fingerprint: "sha256:a70ce0f4bdec0f6c2db89d7cddd420df303be03bfe5a9cb49e2782bdd727613e"
target_path: "C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Budget.jsx"
timestamp: 2026-09-04T23-26-25Z
slug: src-pages-budget-jsx
---
Method: dual-agent (Assessment A: design review · Assessment B: detector/browser evidence)

Note: this page was critiqued once already this session (5 issues fixed: nested-interactive rows, progressbar ARIA, scaleX progress fill, stale-banner restyle, conditional Spent color). This run verified those fixes are holding and found new ground — most notably a real regression sitting inside the very fix that made "Spent" conditional.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | The "Spent" figure is completely invisible against its own hero card in the common (under-budget) case |
| 2 | Match System / Real World | 4 | Category set, LL/dining-tier pills, and "Trip level" vs. "Day N" language map to how a family actually thinks about a Disney trip |
| 3 | User Control and Freedom | 3 | Delete-with-undo is great; but the inline budget-edit input has no Escape/cancel path — only blur-commits |
| 4 | Consistency and Standards | 2 | Budget hero shows 4 stats, CategoryDetail's hero shows only 3 (no Remaining); All Expenses drops the day-grouping headers CategoryDetail uses one click away |
| 5 | Error Prevention | 3 | No confirmation on budget edits (acceptable, low-stakes), but empty/garbage input silently coerces to $0 with no warning |
| 6 | Recognition Rather Than Recall | 2 | All Expenses forces reading each card's inline day text to find where a day starts — no section headers |
| 7 | Flexibility and Efficiency | 3 | The filter sheet (category/day/method) is well-scoped and fast |
| 8 | Aesthetic and Minimalist Design | 3 | Generally restrained; a "-$0" badge on an exactly-on-budget entry is noise |
| 9 | Error Recovery | 2 | A fetch failure renders a bare error paragraph with no retry action |
| 10 | Help and Documentation | n/a | Not a page that needs an in-context help surface at its current scope |
| **Total** | | **24/36** | **Good** |

## Design Specificity Verdict

**LLM assessment**: Mixed, leaning product-specific but with generic-tracker seams. The category set (Lightning Lane, Resort Package, Snacks, Souvenirs), the navy "ticket stamp" hero, and the LL-tier/dining-tier/booth/festival pills on entry rows are unmistakably Parkday — no generic budget app models "Multi Pass vs. Premier Pass." But the All Expenses list, once stripped of icons, is a standard flat transaction ledger with none of the day-by-day narrative CategoryDetail's sectioned view gives it one click away — Disney-specific data poured into a generic list, in that one tab specifically.

**Deterministic scan**: The CLI scanner came back clean against `Budget.jsx` alone. The live browser overlay, run against a real authenticated session, found 17 anti-patterns and — independently of the design review — landed on the exact same root cause for the page's most serious issue: a computed **1.0:1 contrast ratio** for `#0d2340` text on a `#0d2340` background, traced to `Budget.jsx`'s conditional "Spent" color (`totalActual > totalBudgeted ? 'var(--coral)' : 'var(--night)'`) rendered on the hero's own `var(--night)` background — the under-budget branch of last session's own fix is invisible text, not a subtle nit. The overlay also caught a real **3.3:1** (needs 4.5:1) failure on the "Planned" stat's sky-blue text against navy, plus the same 9-10px hero-label undersizing pattern already fixed on the Estimator, Payments, and Budget's own hero bar labels elsewhere — just not carried to this card's footer labels. Two "cyan neon text" flags trace to `--teal`, the same already-documented, muted design-system token flagged as a likely mismatch on Payments — noted, not actioned. Five findings (trip-selector text, bottom-nav labels) belong to shared `AppShell` chrome, out of scope for this page.

**Visual overlays**: Screenshots at desktop and mobile confirmed the invisible Spent value directly — "BUDGETED," "PLANNED," and "REMAINING" all display, "SPENT" shows nothing. A second, separate visual bug was also caught live: the floating "+" FAB overlaps the Experiences category card at a specific mobile scroll position, obscuring its price and percentage text — reproduced twice.

## Overall Impression

The fixes from the last Budget critique are holding up well — the progress bars, ARIA labeling, and the *idea* of a conditional Spent color are all still in place. But that last fix has a real bug hiding inside it: in the far more common case (under budget), "Spent" renders in the exact same color as the card it sits on, making the single number a worried parent checks most often completely unreadable. That, plus a mobile FAB that physically covers a category's numbers, are the two things actually costing users information right now.

## What's Working

1. **`heroBarFill`'s `transform: scaleX()` + `role="progressbar"`** — confirmed still in place from the last fix; smooth and properly labeled for assistive tech.
2. **The delta badge on `EntryCard`** pairs color with a `+`/`-` glyph, so the over/under signal isn't color-only.
3. **The `categoryTotals`/`findBudgetRow` separation** in `lib/categories.js` — a well-modeled domain concept (budget-target row vs. real transaction row sharing a table) that keeps the UI logic correct rather than papering over a data hack.

## Priority Issues

**[P0] "Spent" is invisible in the common (under-budget) case, and its sibling hero labels sit below a reading floor** — Confirmed independently by both assessments: `totalActual > totalBudgeted ? 'var(--coral)' : 'var(--night)'` renders `--night` text on a `--night` background — a 1.0:1 contrast ratio, not a subtle issue. The adjacent "Planned" stat (sky-blue on navy) also fails AA at 3.3:1, and the hero footer labels ("Budgeted"/"Planned"/"Spent"/"Remaining") sit at 9px. **Fix**: give the under-budget "Spent" state a visible light-on-dark color (e.g. white at high opacity, consistent with how "Remaining" already uses `--teal` on this card), lighten "Planned"'s sky tone enough to clear 4.5:1, and bring the footer labels up to the Label floor (10–12.5px) already used elsewhere. → `/impeccable typeset`

**[P1] The FAB overlaps a category card on mobile** — At a specific scroll position on a 390px viewport, the fixed "+" FAB visually covers part of the Experiences card's price and percentage text, reproduced twice. **Fix**: add scroll-aware spacing or a safe-area margin so the FAB never sits directly over card content. → `/impeccable adapt`

**[P1] All Expenses has no day-grouping, unlike its own sibling view** — `CategoryDetail` groups entries under section headers ("DAY 1 · SAT"), but Budget's All Expenses tab renders one flat card stream with only inline "Day N" text per card. This is the highest-volume list in the app, and it's the one place chunking was dropped. **Fix**: reuse the same day-grouping/section-header pattern already built for CategoryDetail — the sort is already day-aware. → `/impeccable layout`

**[P1] The inline budget-edit input has no cancel path** — It only commits on blur or Enter, with no Escape handler to discard a typo; a fat-fingered budget number that gets tapped away from has just changed a real target with no undo, unlike expense deletion which already has one. **Fix**: add an Escape handler that reverts to the original value, and consider extending the existing delete-Undo toast pattern to budget edits. → `/impeccable harden`

**[P2] Resort Package shows conflicting spent totals between the category list and its own detail page** — The Summary tab shows Resort Package as 100% spent ($1,899, 0 entries), but clicking into that category's detail page shows a blank spent figure and "No resort package expenses yet." Confirmed live, not a screenshot artifact. **Fix**: reconcile how a Vacation-Package budget row (paid via the Payments page rather than itemized expenses) is represented consistently across both views. → `/impeccable harden`

## Persona Red Flags

**Sam (Accessibility-Dependent)**: The invisible "Spent" text isn't a contrast nit for Sam — it's a 1:1 ratio, an outright WCAG failure on the single most-checked figure on the page. The budget-edit affordance is a dashed underline plus a 9px pencil icon at 0.4 opacity — a very faint signal that the value is interactive at all, even before considering its correct `aria-label`.

**Riley (Stress-Tester)**: Types a nonsense or empty value into a budget-edit field and blurs — `Number(budgetDraft) || 0` silently coerces it to $0 with a toast that just says "Budget updated," no warning it was interpreted as zero. Rapid-edits one category then another with no visible "saving…" state between blur and refetch, so a slow network briefly shows a stale value with no pending indicator.

**Casey (Distracted Mobile)**: Loses her place in All Expenses after an interruption, since nothing but small inline text marks a day transition (same root cause as the P1 above). The "Filters · 2" badge doesn't remind her which two filters are active without reopening the sheet.

## Minor Observations

- "Remaining" is hardcoded to `var(--teal)` even when the trip is over budget — teal would falsely read as reassuring in the one moment it shouldn't.
- CategoryDetail's hero omits the "Remaining" stat that the top-level Budget hero has, breaking an otherwise-consistent four-stat pattern between the two related surfaces.
- A delta badge shows "-$0" on an entry that cost exactly what was planned — DESIGN.md reserves teal for genuine positive signals, and a $0 result isn't a save; suppressing the badge at delta === 0 would remove noise.
- The bare error paragraph on a failed fetch has no retry button, leaving a flaky-connection user (this is framed as an on-the-go PWA) at a dead end.

## Questions to Consider

- What if the Budget hero's four footer stats collapsed to three on mobile — Budgeted/Spent/Remaining — since "Planned" is the one figure a user checking their trip mid-day cares about least?
- What if All Expenses defaulted to today's position in the trip instead of always starting at Day 1, given this is framed as an in-the-moment tracker?
- Is the swipe-to-delete gesture on EntryCard discoverable at all without a persistent hint, or has everyone just found the edit-sheet's delete button?
