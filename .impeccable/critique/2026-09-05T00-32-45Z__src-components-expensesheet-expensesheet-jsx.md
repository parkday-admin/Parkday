---
target: the add expense drawer
total_score: 21
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\nacst\\Documents\\parkday\\src\\components\\ExpenseSheet\\ExpenseSheet.jsx"
target_fingerprint: "sha256:0a959b67828397692ce23ed938c580947f814e0f07997b840ce9d587ba6d2494"
target_path: "C:\\Users\\nacst\\Documents\\parkday\\src\\components\\ExpenseSheet\\ExpenseSheet.jsx"
timestamp: 2026-09-05T00-32-45Z
slug: src-components-expensesheet-expensesheet-jsx
---
Method: dual-agent (Assessment A: design review · Assessment B: detector/browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | "Saving…" label swap is adequate for a short form |
| 2 | Match System / Real World | 2 | Generic finance vocabulary over Disney-specific concepts; no catalog language anywhere |
| 3 | User Control and Freedom | 2 | Delete fires immediately on one tap, relying entirely on a 5s Undo toast as the only safety net |
| 4 | Consistency and Standards | 2 | Payment Source is a bare native `<select>` while every other choice in the same form is a custom pill; Save button is sky, not gold, contradicting DESIGN.md's own commitment-color rule |
| 5 | Error Prevention | 2 | Only one validation rule exists; a trip-level category (Resort Package) can be assigned to "Day 2" with no guardrail |
| 6 | Recognition Rather Than Recall | 2 | Category pills mix trip-level and day-level categories with no scope grouping |
| 7 | Flexibility and Efficiency | 3 | The Planned→Actual copy shortcut is a genuinely well-observed power-user affordance |
| 8 | Aesthetic and Minimalist Design | 3 | Clean and terse, but every field renders at identical visual weight |
| 9 | Error Recovery | 2 | The one error state that exists is styled correctly, but nothing else in the form has an equivalent guardrail |
| 10 | Help and Documentation | n/a | Not applicable for a fast-entry financial drawer |
| **Total** | | **21/36** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: This is a generic expense-entry form wearing a Parkday skin. Strip the pill styling and sky/gold tokens, and the field set (amount, payment source, category, label, day, optional time/status) is indistinguishable from Mint or Splitwise. The one genuinely product-specific field is Lightning Lane type. Worse: PRODUCT.md explicitly states "detailed catalogs already exist for Lightning Lane/Premier Pass, Annual Pass holder pricing, MNSSHP-style party tickets, and a broad Events/Experiences catalog — cost data is a core, maintained asset of the product," yet `ExpenseSheet.jsx` imports none of it. A user logging a Lightning Lane purchase or a special-event snack gets a free-text Label field instead of a picker into catalogs that demonstrably exist elsewhere in this exact codebase.

**Deterministic scan**: The CLI scanner came back clean against `ExpenseSheet.jsx` alone — the same known blind spot on paired CSS seen throughout this session. The live overlay, run against a real session with the drawer open, found 22 anti-patterns; cross-referencing against source confirms 13 genuinely belong to this component — `.fieldLbl` (10.5px) and `.optional` (10px) are below the 11px floor already fixed this session on the Estimator, Payments, Budget, and Configurator hero/label text, just not carried to this drawer. The remaining ~9 findings (nav labels, cream palette, overused-font, "cyan neon" on `--teal`) belong to the surrounding Budget page the drawer renders on top of, not the drawer itself — out of scope here, consistent with the same false-positive pattern flagged on Payments and Budget's teal usage.

**Visual overlays**: Screenshots at desktop and mobile confirmed the flagged label text matches source exactly, category-conditional fields render correctly (Lightning Lane's type selector only appears for that category), and the mobile layout reflows cleanly with no clipping.

## Overall Impression

The underlying logic here is more thoughtful than the surface suggests — the category-to-field-visibility mapping is genuinely correct (a Lightning Lane Single Pass needs a time slot, Multi Pass doesn't), and the Planned→Actual copy shortcut is a real power-user touch. But the form asks for an amount before it knows what the expense even is, the single most-repeated "commit real money" action in the whole app uses the everyday sky-blue rather than the gold the design system reserves for exactly this moment, and a real financial record can be deleted with one accidental tap.

## What's Working

1. **The `copyPlannedToActual` shortcut** — a well-observed affordance for the very common "I spent exactly what I planned" case, authored for this app's specific planned-vs-actual budgeting model.
2. **Category-color-adaptive selected pills** — selecting a category tints its pill with that category's own accent color from `CATEGORY_META`, reinforcing the category system's color language inside the form itself.
3. **Conditional field rendering keyed to real category semantics** — the data model correctly understands that a Lightning Lane Single Pass needs a time slot but Multi Pass doesn't; the logic is sound even where field ordering undercuts it.

## Priority Issues

**[P0] Category comes after Amount and Payment Source, inverting the natural task order** — Category determines which fields the rest of the form needs (time, status, LL type), yet it's the third field down. A user fills in an amount before the form even knows what kind of expense it is, then has to mentally re-check once category is picked. **Fix**: move Category to the top, followed immediately by its conditional fields, then Amount/Payment/Day. → `/impeccable layout`

**[P1] Save button is sky, not gold** — DESIGN.md reserves gold for "the highest-commitment action on a screen," and this is the single most-repeated commit-real-money action in the entire app, opened from four different surfaces — yet it renders identically to an everyday link action. This matches the exact pattern already fixed this session on PaymentSheet, the Configurator toolbar, and elsewhere. **Fix**: recolor `.saveBtn` to gold with navy text. → `/impeccable clarify`

**[P1] No confirmation on delete** — The trash icon sits right next to the title and fires `deleteExpense` immediately on click, with only a 5-second Undo toast as the safety net — thin for a real financial record, especially one-handed on mobile. **Fix**: add a second-tap confirm matching the pattern already used on Payments/Configurator/Estimator this session. → `/impeccable harden`

**[P1] Field labels and annotations sit below a comfortable reading floor** — `.fieldLbl` (10.5px) and `.optional` (10px) are confirmed live, below the 11px floor already fixed everywhere else this session. **Fix**: bring both up to the documented Label floor. → `/impeccable typeset`

**[P2] No catalog/autocomplete hookup despite catalogs being a core maintained product asset** — Label is a bare free-text input for every category, even though detailed Lightning Lane, Annual Pass, MNSSHP, and Enchanting Extras catalogs exist elsewhere in this codebase. **Fix**: at minimum wire a typeahead sourced from the relevant category's catalog for Experience/Snacks/LL. → `/impeccable colorize`

## Persona Red Flags

**Alex (Power User)**: Has to scroll past Amount and Payment Source before reaching Category, the field that actually matters first for a fast repeat-logging flow. The Day picker has no "last used day" memory — every add resets to a computed default, forcing a re-tap on every entry during active in-park logging.

**Casey (Distracted Mobile)**: The sheet's drag-to-dismiss handle sits directly above the amount input, so an off-angle scroll gesture risks dismissing the whole drawer with typed input lost. The delete icon sits at header height with no tap friction — a one-handed mis-tap in a park queue permanently removes a record unless the 5-second toast is caught in time.

**Sam (Accessibility-Dependent)**: Category/status selection is communicated primarily through border/background/text color changes with no icon or checkmark cue — thin for low-vision or colorblind users. The native `<select>` and `<input type="time">` will behave inconsistently with screen readers compared to the custom pills used everywhere else in the same form.

## Minor Observations

- The Planned amount field shows a literal "0" placeholder rather than an empty hint — reads like a pre-filled value rather than a prompt.
- The header title is always static "Add expense"/"Edit expense" regardless of category — a missed chance to reinforce context (e.g., "Add Dining expense").
- The time-string parser silently returns an empty value on any format it doesn't recognize, with no visible failure mode — editing an expense with an unparseable saved time silently clears that field.
- Payment Source uses a native `<select>` while every other choice control in the same form is a custom pill — breaks the form's own interaction language.
- No preview/receipt-style confirmation before save, despite the app's "ticket" metaphor being a natural fit for exactly that moment.

## Questions to Consider

- What if Category were step one and everything else appeared only after it, turning the drawer into a true adaptive wizard rather than a flat form with visibility toggles?
- What if selecting Experience, Lightning Lane, or Snacks opened a searchable catalog picker instead of a bare text field?
- What if Save became a small "stamped ticket" moment — gold, with a brief receipt-style confirmation ("$45 · Ohana Dinner · Day 2")?
