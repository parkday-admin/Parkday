---
target: the estimator page
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\nacst\\Documents\\parkday\\src\\components\\Estimator\\Estimator.jsx"
target_fingerprint: "sha256:73c0013abdf50b79d33fa3a2ffb2ef17c7fd43844914bdebfe73f1d71a9c89e2"
target_path: "C:\\Users\\nacst\\Documents\\parkday\\src\\components\\Estimator\\Estimator.jsx"
timestamp: 2026-09-04T21-46-41Z
slug: src-components-estimator-estimator-jsx
---
Method: dual-agent (Assessment A: design review · Assessment B: detector/browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Live cost ticket + progress bar always visible, but step-advance doesn't scroll to reveal the new step (confirmed live) |
| 2 | Match System / Real World | 4 | Real WDW vocabulary and pricing structure throughout (Base/Hopper/Hopper Plus, actual LL tiers) |
| 3 | User Control and Freedom | 3 | Back/Reset both present, but Reset is one unconfirmed click that destroys a multi-minute session |
| 4 | Consistency and Standards | 4 | `Option`/`Stepper` components reused identically across all 6 steps |
| 5 | Error Prevention | 2 | Location field free-texts against a small hardcoded city/zip list with no autocomplete |
| 6 | Recognition Rather Than Recall | 3 | Per-selection cost hints (`qHint`, `tsHint`, etc.) show live running cost so users don't have to do the math |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts, no jump-to-step, stepper has no type-to-enter |
| 8 | Aesthetic and Minimalist Design | 3 | Generally restrained, but 15 confirmed instances of functional price/label text at 9–10.5px — below a comfortable reading floor |
| 9 | Error Recovery | 2 | Only inline error state in the whole flow is the location "not found" message, and it isn't visually flagged as an error |
| 10 | Help and Documentation | 3 | Scoped "What's this?" sheets on resort/ticket/LL/dining are strong, but missing on AP-holder toggle and Extras step |
| **Total** | | **29/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Product-specific, and convincingly so — not a generic wizard with Disney words swapped in. The resort-tier options name real sub-brands (All-Star/Pop/Art of Animation vs. Grand Floridian/Polynesian), the ticket step encodes actual WDW product structure with correct up-charges, the Lightning Lane step models Disney's real current tiers including the $449–589/pp/day Premier Pass, and the Annual Pass flow correctly reshapes downstream steps (suppresses the ticket step, applies a resort discount note). The ticket-stub hero block (die-cut circle notches via `::before`/`::after`) is a genuinely authored motif reinforcing the "Park Ticket" north star, not boilerplate.

**Deterministic scan**: The CLI static scanner (`detect.mjs`) run against `Estimator.jsx` alone came back clean — exit 0, zero findings. That result is misleading on its own: the CLI entrypoint doesn't follow the paired `.module.css` file for font-size rules, so it can't see CSS-only violations. The live browser DOM scan (via the bundled overlay script, injected into the actual running page) told a different story: **15 confirmed instances of functional text below 11px** — cost/label text, not decorative eyebrows — all traced by CSS-module class hash back to `Estimator.module.css`:

| Text | Size | Rule |
|---|---|---|
| "Estimated cost" / "Low to high range" / "Per person" | 9px | `.costLbl` (Estimator.module.css:52) |
| "Step 4 of 6" / "Tickets & LL" | 10.5px | `.plStep` / `.plName` (line 68–69) |
| "Ticket type" / "Lightning Lane" section labels | 10px | `.screenSectionLbl` (line 251) |
| Every option-card price badge ("+$74–80/pp/day", "~$449–589/pp/day", "Free", etc. — 7 instances) | 10px | `.obdg` (line 115) |

No false positives — every flagged value matched the CSS source exactly. This is the one place where the detector caught something the design review didn't surface directly: DESIGN.md's own 9px "Micro" tier is explicitly scoped to "the smallest eyebrow tier... never used for anything a user needs to read comfortably at a glance from a distance" — and `.obdg`'s price badges are exactly that: numbers a user needs to read comfortably to make a real financial decision, not a glance-and-forget caption.

**Visual overlays**: Injection succeeded in the assessment's own isolated browser session, but that session's live-server was stopped after evidence was gathered, per the critique workflow's cleanup requirement — there is no overlay currently open in your browser. The table above is the full extracted finding set in place of a live view.

## Overall Impression

This is a well-built, genuinely product-specific cost estimator with the app's best emotional-design asset (the always-visible, live-recalculating cost ticket) doing real anxiety-reduction work. The core mechanism — adaptive step logic, per-selection cost hints, real Disney pricing structure — is solid. What's holding it back from "good" is a cluster of small-but-real gaps concentrated around two things: moments that deserve more visual/interaction weight than they get (a scroll position that doesn't follow step changes, a $2,000+/day option treated identically to "None"), and text that's been pushed below a comfortable reading size across nearly every step.

## What's Working

1. **The live-recalculating cost ticket** — visible on every single step, it means the user never has to wonder "how much did that just add," which is the single strongest anxiety-reduction device in the flow.
2. **Per-selection cost hints** (`qHint`, `tsHint`, `chHint`, `snHint`) — showing "~$45–75/person · est. $360" as a stepper is adjusted is a well-executed, cost-estimator-specific recognition-over-recall pattern.
3. **Conditional step logic** — the flow adapts its own step count and content to the user's actual situation (skips the resort step for day trips, removes the ticket-type grid entirely when the whole party holds Annual Passes) rather than forcing irrelevant screens on everyone.

## Priority Issues

**[P1] Step-advance doesn't scroll the new step into view**
- **Why it matters**: Confirmed live — clicking "Next" after scrolling down (e.g., to read a longer step) leaves the viewport stranded, showing only the floating nav buttons over blurred content below, with the new step's title off-screen. This breaks Heuristic #1 exactly at the moment status should be clearest — a step transition — and is likely worse on mobile's shorter viewport, where it can look like nothing happened at all.
- **Fix**: On step change, scroll the estimator container back into view (`scrollIntoView({ block: 'start' })` in a `useEffect` keyed on `step`).
- **Suggested command**: `/impeccable optimize`

**[P1] Functional price/label text sits below a comfortable reading floor across every step**
- **Why it matters**: 15 confirmed instances (browser-verified, not a static-scan guess) of real decision-relevant text — cost labels, step names, section labels, and every option-card price badge — rendered at 9–10.5px. This is the text a user reads to decide between a $15/day option and a $589/day one; DESIGN.md's own Micro tier explicitly excludes this use case ("never used for anything a user needs to read comfortably at a glance from a distance").
- **Fix**: Bring `.obdg` (price badges) and `.screenSectionLbl` up to the documented Label tier floor (10–12.5px is the range, so nudge to 11–12px), and `.costLbl`/`.plStep`/`.plName` up from 9/10.5px similarly — these carry real numbers, not eyebrow captions.
- **Suggested command**: `/impeccable typeset`

**[P1] Premier Pass ($449–589/pp/day) gets identical interaction weight to "None"**
- **Why it matters**: This is the single largest per-day line item selectable anywhere in the tool — for a family of 4 over a week, a five-figure addition — yet it sits in the same option-grid cell styling as the free option, with no secondary confirmation, no inline cost-delta callout, nothing that acknowledges the size of the commitment at the moment of selection.
- **Fix**: On selecting Premier Pass, surface an inline delta ("+$X,XXX added to your estimate") directly under the grid, reusing the existing `travelEst`/`skippedNote` pattern already present elsewhere in the file.
- **Suggested command**: `/impeccable clarify`

**[P2] Reset destroys a multi-minute session with one unconfirmed click**
- **Why it matters**: `estResetBtn` calls `restart()` directly with no dialog and no undo. A distracted mobile user (thumb-scrolling near the always-visible top-right Reset button) or a stress-tester can lose several minutes of careful input in one mis-tap.
- **Fix**: A lightweight inline "Reset? [confirm]" toggle or a brief undo toast — matching the app's low-drama tone rather than a heavy modal.
- **Suggested command**: `/impeccable harden`

**[P2] Location field only rejects, never suggests**
- **Why it matters**: The free-text location input matches against a small hardcoded city/zip dictionary and silently fails with "City not found" after a debounce — easy to trigger by typing a perfectly valid city that just isn't in the small list, with zero guidance on what would work instead.
- **Fix**: Even a simple "Try your nearest major city or ZIP" hint shown proactively, or nearest-region ZIP matching instead of an exact-match dictionary.
- **Suggested command**: `/impeccable harden`

## Persona Red Flags

**Jordan (First-Timer)**: The "What's this?" links explaining Park Hopper vs. Hopper Plus are 11px inline text after the section label, not styled as an obvious tappable affordance — easy to miss entirely. Worse, the Annual Pass "Wondering if an AP is worth it? →" link is dead — `onClick={e => e.preventDefault()}` — so a first-timer who taps it expecting an explanation gets silence, at exactly the point where they're least equipped to guess what an Annual Pass even is.

**Sam (Accessibility-Dependent)**: The stepper +/− buttons have no `aria-label` in source, so a screen reader announces bare "button" with no indication of what's being incremented. The `Option` component sets no `aria-pressed`/`aria-selected` on selection (the only signal is a border-color shift plus a `display:none`-by-default checkmark), so selection state likely isn't announced to assistive tech at all. And the 15 undersized-text instances above compound directly against Sam's stated need for comfortable reading size — this isn't a hypothetical, it's the same finding the detector confirmed live.

**Casey (Distracted Mobile)**: The unconfirmed Reset button sits persistently above the cost hero on every step — a thumb-scroll mis-tap destroys the session (same root cause as the P2 Reset issue, but specifically dangerous on touch). The step-advance scroll bug is also likely worse here: on a shorter mobile viewport, a mis-scrolled step can leave literally nothing but the floating nav bar visible after tapping Next.

## Minor Observations

- The Experiences sheet (79 items) has no filtering or search — just a flat scroll with park-name subtext as the only implicit grouping. It's explicitly framed as the "not sure? build an estimate" path, which is the persona least equipped to scroll 79 undifferentiated cards. Grouping by park with sticky sub-headers, or a lightweight filter-pill row (the `siSub` label style already exists in CSS and is unused here), would close this without a redesign.
- Step 0 bundles three decisions (party size, stay length, AP holder status) under one step counter that implies one decision per step; AP status in particular silently reshapes two downstream steps (ticket type, resort pricing) without any on-screen acknowledgment of that effect.
- Nothing on-screen echoes prior-step selections — no persistent "your trip so far" recap — so a user second-guessing an earlier choice must Back through screens sequentially to check it.
- `skippedNote` is reused identically for three message types (AP discount applied, all-AP-so-no-tickets, ticketed-party count) — visually the same treatment for "informational" and "here's a discount you got," leaving a small win-framing opportunity (a teal accent per the Semantic-Only Rule) on the table.

## Questions to Consider

- What if the cost ticket showed a one-beat delta ("+$340 from your last selection") after every choice, the way the dining hints already do per-line — would that make the Premier Pass problem solve itself by making every choice's cost impact viscerally visible, without a special-cased confirmation?
- What if AP-holder status were its own step instead of sharing step 0 with the party/stay steppers — would that change how many people even notice it's silently changing what they see next?
- Does "not sure? build an estimate" (the Experiences sheet's own framing) contradict handing that exact user 79 unfiltered choices on open?
