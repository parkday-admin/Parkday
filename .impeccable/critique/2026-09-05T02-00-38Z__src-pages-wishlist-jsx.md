---
target: the wish list page
total_score: 22
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Wishlist.jsx"
target_fingerprint: "sha256:f5b8acd5d6e9f82b0c85baf277e17c7e6bde5e134b2be69b543319deb2bb15f6"
target_path: "C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Wishlist.jsx"
timestamp: 2026-09-05T02-00-38Z
slug: src-pages-wishlist-jsx
---
Method: dual-agent (Assessment A: design review · Assessment B: detector/browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No saved-item count, no "N results" in the browse sheet, no distinct loading state |
| 2 | Match System / Real World | 4 | "Multi Pass · Tier 2," "Party Only," real booth names — fluent Disney-planner language |
| 3 | User Control and Freedom | 2 | No undo on remove; closing the browse sheet resets all filter/search state |
| 4 | Consistency and Standards | 3 | Pills/icons reused consistently with the rest of the app, but edit (circular) and remove (rounded-square) buttons in the same row use two different corner treatments |
| 5 | Error Prevention | 2 | Removing a wish-list item that's already a budgeted trip expense deletes both records immediately with no confirmation |
| 6 | Recognition Rather Than Recall | 3 | Category grouping and icons help; filters show no active-state indicator once you back out and return |
| 7 | Flexibility and Efficiency | 2 | No bulk actions, no sort, no result count for an implied 100+ item catalog |
| 8 | Aesthetic and Minimalist Design | 3 | Category grouping is clean, but dense rows can stack 5-6 pills before the description line |
| 9 | Error Recovery | 1 | Raw Supabase/Postgres error strings render directly to the user with no friendly copy or retry |
| 10 | Help and Documentation | n/a | No help affordance exists anywhere in Parkday — not a page-specific gap |
| **Total** | | **22/36** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Product-specific, and convincingly so — this may be the strongest identity-carrying screen in the app. The pill vocabulary (Multi Pass · Tier 2, Lounge/Bar, MNSSHP festival tags, real booth names like "Adventureland Spring Roll Cart"), park/resort grouping, and seasonal-festival badges are things a generic wishlist feature would never model — the underlying data (`lightning_lane_tier`, `dining_tier`, `booth_id`, `seasonal`) drives real UI distinctions, not just copy. Where it slips toward generic: the actual row/heart-toggle interaction shape (icon tile + name + pills + trailing button) is the same pattern as any e-commerce wishlist — the specificity lives entirely in content, not interaction design.

**Deterministic scan**: The CLI scanner came back clean. The live overlay confirmed the same undersized-text pattern already fixed elsewhere this session — `.pill` (10.5px) and `.catHdr` section headers (10px) sit below the 11px floor. A large batch of "text-occlusion" findings when the catalog sheet was open turned out to be a confirmed false positive: every occlusion pair had the Wishlist page's own elements marked as "covered" by the catalog sheet's elements — that's the sheet correctly rendering on top of the page as a modal, not a real overlap bug. A "theater-slop-phrase" flag on "rotating theater" also traces to literal, factual catalog copy describing an actual attraction mechanism, not AI-marketing filler.

**Visual overlays**: Screenshots confirmed a real layout issue at mobile width not caught by A: when an item's pills wrap to a second line, the category icon box (vertically centered against the whole multi-line block) ends up floating beside the pills rather than the item title.

## Overall Impression

The domain modeling here is the app's best — real Disney-specific data driving real UI distinctions, plus a genuinely thoughtful touch in surfacing which family member favorited what. But the page's chrome doesn't match its content's aspirational register: there's no "building toward the trip" moment, the one emotional beat (the heart-toggle) borrows the app's error/urgent color for affection, and the most consequential action on the page — removing an item that's already become a real budget line — has no more friction than removing an item that was never spent against.

## What's Working

1. **`wlCatMeta()` reusing expense-category icon/color** — the wish list visually rhymes with Budget/Itinerary instead of inventing a parallel color language.
2. **The "Favorited by X and Y" pill** — a specific, well-observed touch for multi-person family planning that couldn't exist in a generic single-user wishlist.
3. **The "Added to Day 2 · Magic Kingdom" confirmation line** — closes the loop between wishing and budgeting cleanly, and is the one place the page shows real state progression instead of a flat saved/unsaved binary.

## Priority Issues

**[P0] Removing a budgeted wish-list item deletes it with no confirmation** — When an item has already been converted to a real trip expense (`planned_expense_id` set, no spend logged yet), the single trash icon immediately deletes both the wish-list row and the linked expense, with only a toast fired afterward. The same icon behaves identically for a merely-saved, never-budgeted item — nothing distinguishes the higher-stakes case. **Fix**: confirm before delete whenever a linked, unspent expense exists, or add an undo action to the toast. → `/impeccable harden`

**[P1] Raw error strings render directly to users** — Supabase/Postgres error messages are shown verbatim in several places, reading as developer text on a page meant to feel like a keepsake ticket. **Fix**: map known error cases to friendly copy with a generic fallback. → `/impeccable clarify`

**[P1] Pills and section headers sit below a comfortable reading floor** — `.pill` (10.5px) and `.catHdr` (10px), confirmed live via the overlay — the same pattern already fixed on the Estimator, Payments, Budget, and Configurator this session, not yet carried to this page. **Fix**: bring both to the 11px floor. → `/impeccable typeset`

**[P2] Filter and search state resets every time the catalog sheet closes** — `BrowseCatalogSheet` and `CatalogGrid`'s filter state is local to components that fully unmount on close. A user who filters to "EPCOT, Dining, $50–150," steps away, and reopens starts completely over — real friction against an implied 100+ item catalog. **Fix**: lift filter state up to the parent Wishlist page so it survives a sheet close/reopen. → `/impeccable harden`

**[P2] The save/heart affordance uses coral, which DESIGN.md reserves for error/urgent meaning** — `.heartBtn.saved` fills coral on save, repurposing the app's one alarm color as its affection color, against the system's own stated Semantic-Only Rule. **Fix**: swap to a warm neutral or gold treatment. → `/impeccable clarify`

## Persona Red Flags

**Jordan (First-Timer)**: Inside the browse sheet, three unlabeled filter dropdowns sit above an undifferentiated flat scroll of dozens of cards — nothing signals "there are 79+ items here, use these filters," so a first-timer may just infinite-scroll past the filter bar's purpose.

**Sam (Accessibility-Dependent)**: The catalog filter `<select>` elements have no associated `<label>`. More significantly, edit/remove/heart icon-only buttons rely solely on `title` attributes rather than `aria-label` — `title` tooltips aren't reliably exposed by screen readers and aren't reachable at all on touch devices.

**Casey (Distracted Mobile)**: The search field in the browse sheet has no visible clear ("×") button, forcing a manual select-all/backspace. Edit and Remove sit as two adjacent same-size circular icon buttons 8px apart with only a border-color difference — easy to mis-tap between "add to trip" and "delete" while distracted.

## Minor Observations

- Edit (circular) and Remove (rounded-square) buttons in the same row use two different corner-radius treatments with no evident reason.
- At mobile width, when an item's pills wrap to a second line, the category icon box centers against the whole block and ends up floating beside the pills rather than the item title.
- `boothNameById` is independently rebuilt in both `Wishlist.jsx` and `CatalogGrid.jsx` from the same catalog array — duplicated derivation logic that could live in `lib/wishlist.js` alongside `wlCatMeta`.
- The "+" icon-only "Add custom item" button sits directly next to the full-text "Browse catalog" button — asymmetric affordance weighting for two actions of similar importance.
- No visible total or filtered-result count in the browse sheet despite the catalog clearly being large.

## Questions to Consider

- What if the Wish List opened with something closer to Dashboard's navy hero treatment — "You're dreaming about N things across M days" — so saving items felt like building toward the trip rather than managing a checklist?
- What if the catalog browse experience were less "database table with filters" and more "flip through a park guide" — larger cards, one category at a time — given the aspirational register this page should carry versus Budget/Payments?
- What if removing a budgeted wish-list item used the same confirm-and-explain pattern the app now uses elsewhere for destructive budget actions?
