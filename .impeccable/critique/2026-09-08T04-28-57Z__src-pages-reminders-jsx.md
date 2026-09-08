---
target: the reminders page
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Reminders.jsx"
target_fingerprint: "sha256:ea8b28b68d7faa0258f59c9bc31842c739722a17e424707cac57e151a24f3a5e"
target_path: "C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Reminders.jsx"
timestamp: 2026-09-08T04-28-57Z
slug: src-pages-reminders-jsx
closed: true
---
Method: dual-agent (A: general-purpose design review · B: general-purpose detector/browser evidence)

**Synthesis note**: While verifying Assessment A's findings against source, I found its headline P0 ("a user can delete the 'Final payment due' system reminder with one tap, no confirmation") does not hold up: [Reminders.jsx:79-80](src/pages/Reminders.jsx:79) explicitly blocks `handleCardClick` from opening the edit/delete sheet for any reminder where `r.system` is true, and every row `buildSystemReminders()` generates carries `system: true` ([reminders.js:139](src/lib/reminders.js:139)). System reminders can only be checked/unchecked (fully reversible), never deleted, through this UI. I've corrected the heuristic scores, priority list, and emotional-journey read below accordingly rather than passing the error through. The underlying "no delete confirmation" observation is still real — it just applies only to the user's own custom reminders, which lowers its severity.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toggling done/undone gives no toast confirmation, only the checkbox fill; minor gap |
| 2 | Match System / Real World | 4 | `buildSystemReminders()` copy is genuinely trip-literate — real ADR windows, LL windows, final-payment math |
| 3 | User Control and Freedom | 3 | No undo on deleting a *user-created* reminder — system reminders are protected from deletion entirely |
| 4 | Consistency and Standards | 2 | Coral and teal are used decoratively on 3 system-reminder category icons, breaking the app's own Semantic-Only color rule |
| 5 | Error Prevention | 3 | Same bounded gap as #3 — only self-authored reminders are exposed to unconfirmed delete |
| 6 | Recognition Rather Than Recall | 3 | Category icons/colors aid scanning; touch/tap targets are adequately labeled visually |
| 7 | Flexibility and Efficiency | 2 | One sort toggle only (soonest/latest) — no filter by category or system-vs-user, no snooze, no bulk actions |
| 8 | Aesthetic and Minimalist Design | 3 | Clean card layout; description text always fully expanded adds some visual weight |
| 9 | Error Recovery | 2 | Raw Supabase `error.message` surfaced directly in both [Reminders.jsx:75](src/pages/Reminders.jsx:75) and [ReminderSheet.jsx:43,52](src/components/ReminderSheet/ReminderSheet.jsx:43) |
| 10 | Help and Documentation | 3 | Each system reminder already carries an inline rationale in `.desc` (good); but nothing in the UI marks a reminder as "Disney-required" vs. self-added |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict

**LLM assessment**: Strong on substance, generic on surface — the same split found on the Packing page. [reminders.js](src/lib/reminders.js)'s `buildSystemReminders()` is genuinely bespoke Disney-trip domain modeling: 60-day ADR/experience booking windows off `arrival_date`, a 10-day online-check-in window, resort-tier-dependent Lightning Lane Multi Pass windows (7 vs. 3 days, keyed off `earlyLLAccess`), an Individual Lightning Lane reminder that only appears for `booking_type === 'singles'`, and a final-payment reminder gated on package bookings. The copy is trip-literate ("Be Our Guest, Cinderella's Royal Table... fill up within minutes"). But the *presentation* — plain white cards, a circular checkbox, a sort toggle, an "Add reminder" button — is indistinguishable from a generic todo app. The bespoke value lives entirely in what gets generated, not in how it's surfaced or visually distinguished from a user's own to-dos.

**Deterministic scan**: `detect.mjs --json` ran clean (exit 0, empty findings) against [Reminders.jsx](src/pages/Reminders.jsx), [reminders.js](src/lib/reminders.js), and [Reminders.module.css](src/pages/Reminders.module.css). The manual mechanical scan caught what the CLI doesn't check for: two clickable `<div>`s with no keyboard access ([Reminders.jsx:19](src/pages/Reminders.jsx:19) the card itself, [Reminders.jsx:112](src/pages/Reminders.jsx:112) the "Completed" toggle), a check button with only a `title` attribute and no `aria-label` ([Reminders.jsx:20-24](src/pages/Reminders.jsx:20)), and a hardcoded `#8a5a00` in two places ([Reminders.module.css:44](src/pages/Reminders.module.css:44), [reminders.js:136](src/lib/reminders.js:136)) that — I confirmed against `src/index.css:13` — exactly duplicates the existing `--gold-text` token as a literal instead of referencing it. Assessment A separately characterized this hex as "an undocumented custom brown"; that's incorrect, it's the documented gold-text value, just not expressed as a variable here. Assessment B also flagged coral/teal usage sites without naming the rule they break; connecting that to DESIGN.md's Semantic-Only Rule turns it into the most concrete design-system violation on this page (see Priority Issues).

**Visual overlays**: Browser injection/mutation succeeded (confirmed via `document.title` and a live script tag), and Assessment B reached the actual authenticated Reminders list directly (the dev session was already logged in) — three active cards, a collapsed "Completed (4)" section, and the add-reminder button all rendered as coded. The bundled live-detector overlay workflow remains a multi-step session tool rather than a fire-and-forget script, so **no user-visible overlay exists for this run**; findings above are grounded in source + a live screenshot, not an annotated overlay.

## Overall Impression

Same story as the Packing page: the domain logic is doing real work the user never sees credit for, while the chrome around it reads as generic. The one issue that's genuinely more serious here than a generic-checklist complaint is the color-semantics breach — this app has a named, deliberate rule ("coral and teal carry error/urgent and success/positive meaning only, never decoration") and this page violates it three times over on the exact reminders meant to carry the most weight (final payment, Lightning Lane). That's a design-system integrity problem, not just a missed opportunity.

## What's Working

1. **`buildSystemReminders()`'s domain modeling** — resort-tier-conditional Lightning Lane windows, booking-type-conditional final payment, arrival-date-relative math throughout. This is the real product value on this page.
2. **The done-checkbox's `stopPropagation`** ([Reminders.jsx:24](src/pages/Reminders.jsx:24)) correctly separates "mark done" from "open to edit," avoiding accidental edits from a mis-tap.
3. **System reminders are protected from accidental deletion** ([Reminders.jsx:79-80](src/pages/Reminders.jsx:79)) — a deliberate, correct guard that keeps auto-generated logic from being silently corrupted or lost.

## Priority Issues

**[P1] Coral and teal are used decoratively, breaking the app's own Semantic-Only color rule**
- **Why it matters**: DESIGN.md is explicit that coral and teal exist only to mean error/urgent or success/positive — "never decoration." Here, `var(--coral-text)` colors the "Individual Lightning Lane" icon, `var(--teal-dark)` colors "Final payment due," and a hardcoded `#1B7D68` (≈teal-dark) colors "Lightning Lane Multi Pass" ([reminders.js:110,119,128](src/lib/reminders.js:110)) — none of these relate to urgency or success, they're just category color-coding. This dilutes the one signal (urgency pills) that's supposed to carry real meaning on this page, since the same colors now show up as decoration elsewhere on the same card.
- **Fix**: Give system-reminder categories their own non-semantic accent (the app already has a small categorical palette — violet/sunset/steel tones documented in DESIGN.md for exactly this "several distinct categories on one row" case) instead of reusing coral/teal.
- **Suggested command**: `/impeccable colorize`

**[P1] Reminder cards and the "Completed" toggle are unreachable by keyboard**
- **Why it matters**: Both the card ([Reminders.jsx:19](src/pages/Reminders.jsx:19)) and the completed-section toggle ([Reminders.jsx:112](src/pages/Reminders.jsx:112)) are plain `<div onClick>` with no `role`, `tabIndex`, or key handler — a keyboard-only or screen-reader user cannot open a reminder to edit it or expand the completed list at all. This is the same gap class already found and fixed on the Packing page this session, using the app's existing `onActivateKey` helper from `src/lib/a11y.js`.
- **Fix**: Add `role="button"`, `tabIndex={0}`, and `onKeyDown={onActivateKey(...)}` to both elements, matching the Dashboard.jsx convention already used elsewhere.
- **Suggested command**: `/impeccable audit`

**[P1] Urgency treatment doesn't scale with stakes**
- **Why it matters**: `urgencyLevel()` ([reminders.js:56](src/lib/reminders.js:56)) scores every reminder identically by days-out alone. A "Final payment due" reminder and a "Pack bags" reminder both sitting 10 days out get the identical "Upcoming" gold pill — the UI gives no earlier or stronger warning for a reminder with real financial/logistical consequences than for a low-stakes packing nudge.
- **Fix**: Weight urgency thresholds by reminder type (e.g., system/financial reminders escalate to "Urgent" earlier than day-count-only logic would suggest).
- **Suggested command**: `/impeccable clarify`

**[P2] No delete confirmation for user-created reminders**
- **Why it matters**: `ReminderSheet.jsx`'s `handleDelete` ([ReminderSheet.jsx:47](src/components/ReminderSheet/ReminderSheet.jsx:47)) removes a reminder instantly with no confirm step. This is bounded to reminders the user typed in themselves (system reminders can't reach this code path at all), so the impact is a lost personal note, not a missed trip deadline — but it's still an easy, irreversible mistake.
- **Fix**: Add the same tap-to-confirm or undo-toast pattern already used elsewhere in the app (e.g. Packing's item-delete undo).
- **Suggested command**: `/impeccable harden`

**[P2] Raw backend error strings shown to users**
- **Why it matters**: Both `handleToggle` ([Reminders.jsx:75](src/pages/Reminders.jsx:75)) and `ReminderSheet`'s save/delete paths ([ReminderSheet.jsx:43,52](src/components/ReminderSheet/ReminderSheet.jsx:43)) pass `error.message` straight into the toast — Postgres/Supabase text, not user-facing copy.
- **Fix**: Map to plain-language copy with a generic fallback, matching the fix already applied on Packing.
- **Suggested command**: `/impeccable clarify`

**[P3] Hardcoded `#8a5a00` duplicates the existing `--gold-text` token**
- **Why it matters**: [Reminders.module.css:44](src/pages/Reminders.module.css:44) and [reminders.js:136](src/lib/reminders.js:136) both hardcode `#8a5a00` instead of referencing `var(--gold-text)` (defined in `src/index.css:13`). Not a visual bug today, but a maintenance trap if the token ever changes.
- **Fix**: Replace both literals with `var(--gold-text)`.
- **Suggested command**: `/impeccable audit`

## Persona Red Flags

**Sam (Accessibility-Dependent)**: The check button is 23×23px ([Reminders.module.css:26](src/pages/Reminders.module.css:26)) — below the ~44px touch-target guideline — and has only a `title` attribute ("Mark done"/"Mark not done"), not an `aria-label`; a screen-reader user in a list of several reminders has no way to hear *which* reminder a given checkbox belongs to. Combined with the keyboard-inaccessible card (P1 above), a keyboard/screen-reader user can toggle a reminder done but cannot open, edit, or read its full detail at all.

**Riley (Stress Tester)**: `handleToggle` ([Reminders.jsx:73-77](src/pages/Reminders.jsx:73)) has no pending-state guard — rapid double-tapping the check button fires two overlapping `setReminderDone` calls with no debounce, risking a toggle-then-toggle-back race where the final displayed state doesn't match what was actually written.

**Jordan (First-Timer)**: Each system reminder's description already explains its own rationale well (e.g., "Opens 10 days before arrival..."), but nothing in the list distinguishes a Disney-required system reminder from a personal one the user added — both render as identical white cards, so a first-timer can't tell at a glance which items are trip-critical.

## Minor Observations

- The sort toggle only offers soonest/latest ([Reminders.module.css:12](src/pages/Reminders.module.css:12)) despite urgency already being computed — no "urgent first" option.
- Full descriptions render inline for every active reminder with no collapse; with up to 6 system reminders possible before any user additions (dining, experience, check-in, LL Multi Pass, Individual LL, final payment, pack bags), the list is already near the ≤4-item chunking guideline before a family adds anything of their own.
- The "All caught up." empty state ([Reminders.jsx:105](src/pages/Reminders.jsx:105)) is a single plain line — a missed peak-moment opportunity compared to Packing's "All packed! Nice work." treatment on the same kind of completion state.

## Questions to Consider

- Should a "Disney-required" system reminder be visually distinguished from a user's own personal reminder, rather than rendering as an identical card?
- Given that urgency is currently days-out-only, should reminder *type* (financial/logistical deadline vs. a personal nudge) factor into how urgent something looks?
- Is the categorical color palette (violet/sunset/steel) documented in DESIGN.md for exactly this kind of "several distinct types on one row" case — should it replace coral/teal here?
