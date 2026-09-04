---
target: the payments page
total_score: 23
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Payments.jsx"
target_fingerprint: "sha256:f1fe621ca230cdbbc975ee4c92dd0f6bf884c7b068b2057b7a49b0b8d0426fd2"
target_path: "C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Payments.jsx"
timestamp: 2026-09-04T23-04-24Z
slug: src-pages-payments-jsx
---
Method: dual-agent (Assessment A: design review · Assessment B: detector/browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Progress bar + urgency pill are clear; no visible saving spinner beyond a disabled-button label swap |
| 2 | Match System / Real World | 3 | The "Disney will charge $X on [date]" projection sentence correctly encodes real package-plan auto-charge behavior |
| 3 | User Control and Freedom | 2 | Deleting a payment fires immediately on trash-icon click — no confirm, no undo |
| 4 | Consistency and Standards | 2 | PaymentSheet's Save button is sky blue, not gold — DESIGN.md reserves gold for a screen's single highest-commitment action, and logging a real payment is exactly that |
| 5 | Error Prevention | 2 | No check that an entered amount doesn't wildly exceed the remaining balance; depleted gift cards appear in the dropdown as plain, selectable text |
| 6 | Recognition Rather Than Recall | 3 | The full payment log is always visible — nothing to remember |
| 7 | Flexibility and Efficiency | 2 | No sort/filter/search or bulk actions on the payment log (fine today, won't scale) |
| 8 | Aesthetic and Minimalist Design | 3 | Clean card stack, but confirmed-live text sitting at 9–10.5px across hero labels and pills |
| 9 | Error Recovery | 3 | The gift-card-overdraft error message is specific and actionable |
| 10 | Help and Documentation | n/a | Not a page that needs a help affordance at its current scope |
| **Total** | | **23/36** | **Good** (applicable max renormalized; heuristic 10 n/a) |

## Design Specificity Verdict

**LLM assessment**: Mostly generic, with one genuinely product-specific moment carrying real weight. The hero block, urgency pill, progress bar, and log rows are a textbook bill-tracker pattern — nothing here would need to change if this tracked mortgage payments or SaaS invoices instead. The one real exception: the projection card's "If you make no additional payments, Disney will charge **$X** on **[date]**" correctly encodes Disney's actual auto-charge-on-final-payment-date behavior — a genuine piece of domain logic, not decoration. Payment-method pills naming "Disney Gift Card" and "Inspire" (a rewards program) are data-driven specificity, not designed specificity — the UI has no bespoke treatment differentiating a gift-card payment from a cash one beyond a generic pill.

**Deterministic scan**: The CLI static scanner came back clean against `Payments.jsx` alone (exit 0), but that's the same known blind spot seen on the Estimator and Configurator — it doesn't follow the paired `.module.css` for font-size rules. The live browser overlay, run against a real authenticated session with real trip data, told a fuller story: **24 anti-patterns total on the rendered page**, of which the ones actually attributable to this component are a close match to the exact pattern already fixed on the Estimator and Configurator hero cards:

| Text | Size | Rule |
|---|---|---|
| "Total package cost" / "Remaining balance" / "Paid to date" / "Remaining" / "Final payment" | 9px | `.heroLbl`/`.heroRightLbl`/`.heroFooterLbl` |
| "Done" (urgency pill) | 10.5px | `.urgencyPill` |
| "Disney Gift Card" / "Credit card" / "Inspire" (×multiple) | 10.5px | `.methodPill` |

The overlay also flagged `.heroBarFill { transition: width }` as a layout-thrash pattern — the same animated-`width` approach already replaced with `transform: scaleX()` on the Budget and Estimator hero bars, just not carried over here. One flag is a confirmed false positive: "cyan neon text on dark background" traces to `--teal` (`#2CA58D`, RGB 44,165,141) — a muted, already-documented design-system token used consistently across the app, not an actual neon color; the detector's heuristic mismatched a legitimate accent for a garish one. Four other findings (trip-selector text, bottom-nav labels, "overused font," "cream palette") belong to shared app chrome (`AppShell`, global `index.css`), not this page, and are out of scope here.

**Visual overlays**: Live screenshots were captured at desktop and mobile widths with the overlay active; both confirmed the flagged elements match source exactly, with no layout breakage at either width.

## Overall Impression

The payment-tracking mechanics are more careful than they first appear — the overdraft guard correctly excludes a payment's own prior amount when editing itself, and the final-payment projection sentence is the one line on the page that explains real consequence instead of just showing a number. But the page's safety net is missing exactly where a financial record needs it most: deleting a row is instant and irreversible, and nothing stops a fat-fingered $5,000 entry against a $1,899 balance from silently clamping to a nonsensical result.

## What's Working

1. **The final-payment projection sentence** — "If you make no additional payments, Disney will charge **$X** on **[date]**" is rare in a bill-tracker: it explains consequence, not just data.
2. **The gift-card/reward overdraft guard** — correctly avoids double-counting a payment against its own prior amount when editing an existing entry, a subtlety most bill trackers get wrong.
3. **The hero's conditional remaining-balance color** (teal vs. coral) gives an at-a-glance status signal consistent with the design system's semantic-color rule.

## Priority Issues

**[P0] Delete has no confirmation or undo** — The trash icon on each payment row calls delete immediately on click, with only a passive "Payment removed" toast afterward — no confirm step, no undo action on the toast itself. For a page whose entire purpose is an accurate financial record, and with the delete button sitting just 8px from the edit button, an accidental tap permanently destroys a record with zero recovery path. **Fix**: add a confirm step, or make the "Payment removed" toast carry an actual Undo action. → `/impeccable harden`

**[P1] Hero labels and pills sit below a comfortable reading floor, and the progress bar uses the already-fixed animated-width pattern** — 9px hero labels, 10.5px badges/pills, and a `transition: width` progress fill are exactly the pattern already remediated on the Estimator and Budget hero cards this session, just not carried over to Payments. **Fix**: bring `.heroLbl`/`.heroRightLbl`/`.heroFooterLbl`/`.urgencyPill`/`.methodPill` up to the documented Label floor (10–12.5px), and convert `.heroBarFill` to `transform: scaleX()`. → `/impeccable typeset`

**[P1] Primary Save button color breaks the design system's own commitment signal** — `PaymentSheet`'s Save button is sky blue, but DESIGN.md reserves gold for "the single highest-commitment action per screen." Logging a real payment is unambiguously that action on this sheet, yet it's styled identically to low-stakes confirms elsewhere. **Fix**: make PaymentSheet's Save gold, consistent with the rule as written. → `/impeccable clarify`

**[P1] No sanity check between an entered amount and the remaining balance** — `handleSave` only validates `amount > 0`; a manual/cash entry has no ceiling at all (only gift-card/reward sources get the overdraft guard), so a typo like $5,000 against a $1,899 balance silently clamps the remaining-balance math to $0 with no warning. **Fix**: warn (not necessarily block) when an entry would push paid-to-date meaningfully past the total package cost. → `/impeccable harden`

**[P2] Depleted gift cards appear in the payment-method dropdown as plain, selectable text** — a $0-balance card shows as "— Depleted" inside a flat `<select>`; picking it only surfaces an error after Save. **Fix**: disable/grey the option so the mistake can't be made in the first place. → `/impeccable harden`

## Persona Red Flags

**Riley (Stress-Tester)**: Mis-taps the trash icon (32px circle, 8px from the edit pencil) and loses a record with no recovery. Enters an amount larger than the trip's total package cost — nothing stops it; the remaining-balance math just clamps to $0 silently rather than surfacing the error. Rapid double-click on Save has only a disabled-button guard with no visible lock/spinner, leaving a slow-network double-submit window.

**Jordan (First-Timer)**: On a trip with no package payment plan, the empty-state copy tells them to "log this on the Budget page instead" but gives no actual link or CTA to get there — it's instructional text, not an actionable path. The method dropdown's "Other / Gift cards / Rewards" grouping assumes a first-timer already understands the gift-card/reward-program distinction in this specific app.

**Casey (Distracted Mobile)**: The edit/delete icon pair is a tight target for a thumb reaching across a mobile-width row while distracted, compounding the P0 delete risk. The method pill has no `flex-wrap` guard, so a longer reward-program name risks wrapping awkwardly against the dollar amount on a narrow screen.

## Minor Observations

- Every payment row uses the identical receipt icon regardless of method — a method-specific glyph (card, gift, wallet) would add free scannability.
- The "Done" urgency pill duplicates the "Paid" value already shown one line above it when a trip is paid in full.
- The "no active payment plan" empty state is a plain one-line note, while the "no trip" empty state gets a full icon + headline + subhead treatment — inconsistent empty-state investment on the same page.
- Payment sorting relies on plain string comparison of `YYYY-MM-DD` dates — works today, but fragile if that format assumption ever changes.

## Questions to Consider

- What if the projection card led the page, right under the hero, instead of sitting after the paid-in-full state — since "what's coming" is the anxiety-driving question a user opens this page to answer?
- What if deleting a payment required confirming the amount, given this is a financial ledger and not a to-do list?
- What if the payment log grouped rows by month or by milestone (deposit vs. final payment) instead of a flat reverse-chronological list?
