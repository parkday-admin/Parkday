---
target: the configurator page
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\nacst\\Documents\\parkday\\src\\components\\Configurator\\Configurator.jsx"
target_fingerprint: "sha256:b26eaa2da3f1855f47d580ca562b7efcac9406fad4c6885a828850cd8a9cf2eb"
target_path: "C:\\Users\\nacst\\Documents\\parkday\\src\\components\\Configurator\\Configurator.jsx"
timestamp: 2026-09-04T22-42-20Z
slug: src-components-configurator-configurator-jsx
---
Method: dual-agent (Assessment A: design review · Assessment B: detector/browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Progress bar + step label + "Saving…" state present, but the edit-mode quick-Save gives no immediate confirmation |
| 2 | Match System / Real World | 4 | Real transfer operators, real ticket/LL naming, real price bands throughout |
| 3 | User Control and Freedom | 2 | Reset wipes all state with zero confirmation, while a smaller date edit on an existing trip gets a full `window.confirm()` — inverted severity |
| 4 | Consistency and Standards | 2 | Coral badge used decoratively on a pricing tier (Semantic-Only Rule violation); two different colors for the same "commit" action across screens |
| 5 | Error Prevention | 1 | No step has a completion guard — missing resort/transport/park-days only surface as "X needed" text on the final Review screen |
| 6 | Recognition Rather Than Recall | 3 | Review recaps every selection with an inline Edit link that jumps straight to the source step |
| 7 | Flexibility and Efficiency | 2 | Per-card Edit jump is a good shortcut, but there's no draft persistence at all — an accidental refresh loses the entire session |
| 8 | Aesthetic and Minimalist Design | 3 | Well-chunked and on-brand; consistent with the design system |
| 9 | Error Recovery | 2 | The date-jump alert is on-brand, but the initial gate for the same scenario is a bare native `window.confirm()` |
| 10 | Help and Documentation | 2 | Good contextual micro-copy (AP/Swan & Dolphin/dining-minimum notes), but nothing explains what happens to already-logged expenses on edit |
| **Total** | | **24/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Product-specific, and clearly so. The domain logic is deep and correct — Annual Pass holders are excluded from ticket budgeting and Vacation Packages, Swan & Dolphin gets a dining-plan-ineligibility note, Lightning Lane tiers carry real price bands, dining-plan minimum-nights rules are enforced, and there's a bespoke "this looks like a different trip" guard tied to the product's Trip Pass model. That's authored-for-Parkday logic no generic form-builder would produce. Where it slips toward generic: the Review step's seven day-to-day budget line items are bare `$` inputs with no computed suggestion — after five steps of Disney-specific selection, the user is handed blank boxes to guess-fill, same as any budgeting app.

**Deterministic scan**: The CLI static scanner came back clean against `Configurator.jsx` — exit 0, zero findings. Live browser evidence could not be collected at all: `/configurator` sits behind two stacked `RequirePaidAuth` gates (session + active paid access), stricter than sibling routes like `/account`, and — unlike the Estimator, which is also embedded unauthenticated on the homepage — no public/unauthenticated route anywhere in the app renders this component. This critique is therefore source-level only for the Configurator; there is no live-rendered evidence to weigh against the design review's judgment calls (hover states, actual mobile touch behavior, and animation feel are all unverified).

**Visual overlays**: None — injection was never attempted since there was no reachable page to inject into.

## Overall Impression

The domain logic here is the most sophisticated in the app — AP exclusions, package/dining eligibility rules, and a real "did the dates change enough to matter" guard all show genuine product thinking. But the safety net is inverted: the actually destructive action (Reset) has no confirmation, while a comparatively minor field edit does. And nothing stops a user from walking all six steps only to discover at the very end, on the Review screen, that they forgot to pick a resort — in a tool explicitly meant for precise, consequential data entry.

## What's Working

1. **AP-aware conditional logic surfaced as real UI, not just backend math** — copy changes ("Your whole party has Annual Passes — no ticket purchase needed"), an AP pill on party rows, and a disabled ticket field all make the exclusion visible rather than silently changing numbers underneath the user.
2. **The Review step's per-category Edit jump** — lets an experienced user correct one field without re-walking the wizard, a real efficiency win layered onto an otherwise linear flow.
3. **The `bkCard` review layout** pairs an icon + editable budget field inline with the selection summary (e.g., "Flying into MCO / Mears Connect" next to its own `$` field in one card) — ties the qualitative choice to its dollar consequence in the same visual unit, exactly the "real budget baseline" framing this tool needs.

## Priority Issues

**[P0] No draft persistence for a new trip** — Wizard state lives only in `useState` with no localStorage backing and no `beforeunload` guard. A six-step flow (flight numbers, resort search, per-day park selections) can be lost entirely to an accidental refresh, back-swipe, or interruption — exactly the scenario a mobile, on-the-go user (this product's stated primary usage) is most likely to hit. **Fix**: persist state to localStorage keyed by tripId/"new", restore on mount, clear on successful save. → `/impeccable harden`

**[P1] Incomplete steps are never blocked or flagged until Review** — No step has a completion check; missing resort, transport choice, or park days only surface afterward as "X needed" text on the Review screen. A user can spend several minutes on the flow and only then discover they have to jump backward. **Fix**: warn or soft-block `Next` when the current step's required fields are empty, or surface a completeness indicator on the progress bar itself. → `/impeccable harden`

**[P1] Destructive Reset has no confirmation while a smaller date edit does** — Reset wipes all wizard state on one click with no dialog, while a comparatively minor date change on an existing trip is gated behind a full `window.confirm()`. The safety net is backwards relative to actual risk. **Fix**: add a styled confirm step to Reset, consistent with the app's own guard pattern elsewhere. → `/impeccable harden`

**[P2] Coral badge used decoratively on a pricing tier** — The "MP + Singles" Lightning Lane badge uses the `bc` (coral) class on a price tier, not an error/warning state — a direct violation of DESIGN.md's Semantic-Only Rule, and it risks reading as a warning badge next to the app's real error states. **Fix**: reassign to `bo` (gold, already used for the adjacent Premier Pass tier). → `/impeccable clarify`

**[P2] Native `window.confirm()` breaks the design system at the highest-stakes moment** — The initial "these dates look like a different trip" gate uses a raw browser dialog, immediately adjacent to a fully-styled, on-brand alert for the related Trip Pass upgrade case. One code path for the same underlying scenario is branded; the other drops into unstyled OS chrome exactly where reassurance matters most. **Fix**: replace with a styled in-app confirm modal matching the existing alert's visual language. → `/impeccable clarify`

## Persona Red Flags

**Sam (Accessibility-Dependent)**: Selectable options and toggle buttons carry state purely via CSS class + a visually-hidden check icon — no `aria-pressed`/`aria-checked` anywhere, so a screen reader hears "button" with no indication of selection state. Stepper +/− buttons are below the ~44px touch-target guidance and have no `aria-label` beyond the bare glyph, with the adjacent label never tied via `aria-labelledby`.

**Riley (Stress-Tester)**: Toggling a family member's AP status *after* choosing a Vacation Package silently reverts booking to "separate" with no visible notice at the moment it happens — a stress-tester will find their package choice quietly gone later with no toast or explanation. The day-trip step-numbering math combined with the progress bar's "skipped" segment is a prime edge case to break if `dayTrip` is toggled mid-flow after the user has already passed that step index.

**Casey (Distracted Mobile)**: No draft persistence (see P0) is the single biggest risk for this persona specifically. Park-selection pills (4-column grid, ~10px text, tight padding) are small, dense touch targets on a phone — exactly the kind of control a distracted mobile user mis-taps.

## Minor Observations

- Two different colors mark the same "commit" action: the edit-mode toolbar's quick-Save is sky blue, while Review's save button is gold — DESIGN.md reserves gold for the single highest-commitment action per screen, so this dilutes that signal. Worth deciding whether the toolbar save is truly primary or intentionally secondary.
- Several inline `style={{...}}` overrides exist alongside the file's otherwise-consistent `styles.*` discipline — a maintainability smell more than a user-facing issue.
- The resort-search empty-state copy ("Try 'Caribbean', 'Polynesian', or 'Swan'") is a nice specific touch but hardcoded — will go stale silently if the resort catalog changes.
- `BudgetField`'s finer step increment for smaller day-to-day categories vs. coarser for big-ticket ones is a thoughtful touch, but nothing communicates it to the user.

## Questions to Consider

- What if the Review screen's 7 blank budget fields were pre-filled with a computed suggestion (party size × nights × the per-person rates the wizard already showed as LL/ticket badges earlier), instead of asking the user to re-derive numbers the tool already implied?
- What if "editing a live trip" and "creating a new trip" were visually differentiated more sharply — e.g., a persistent "You're editing an active trip" banner — given this is the one surface where a mistake touches real, already-tracked money?
- What if the wizard auto-saved a draft on every step transition, turning this from a single unbroken session into something a distracted user could safely abandon and resume?
