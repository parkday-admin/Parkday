---
target: the gift card page
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Gifts.jsx"
target_fingerprint: "sha256:d777aa2d5294eb694a3ba3508a8639c9118c7c7f084005e4770f74d077d5f88a"
target_path: "C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Gifts.jsx"
timestamp: 2026-09-05T03-46-27Z
slug: src-pages-gifts-jsx
---
Method: dual-agent (A: design-review subagent · B: detector/browser-evidence subagent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | "Saving…" state works, but a depleted card with zero linked expenses leaves no trail of where the money went |
| 2 | Match System / Real World | 2 | "Source" field label is database-speak; conflates "where bought" with "how received" in one datalist |
| 3 | User Control and Freedom | 1 | Delete fires immediately on click, no undo, no confirmation |
| 4 | Consistency and Standards | 1 | Save button uses var(--sky) here and in RewardSheet, while sibling ExpenseSheet correctly uses var(--gold) for the same primary role |
| 5 | Error Prevention | 1 | No delete/deplete confirmation; nothing blocks balance > original_amount or non-numeric input |
| 6 | Recognition Rather Than Recall | 3 | Source datalist autocomplete and last-4 pills genuinely help |
| 7 | Flexibility and Efficiency of Use | 2 | No bulk actions or sort/filter as card count grows; every partial spend reconciles through a separate Expense flow |
| 8 | Aesthetic and Minimalist Design | 2 | Hero block is handsome, but its 3-stat footer row uses gold/coral/teal decoratively, and one measurably fails contrast |
| 9 | Error Recovery | 1 | Only error message is a bare "Enter a source"; backend errors surface as raw error.message in a toast |
| 10 | Help and Documentation | 2 | No explainer for how "Rewards" differs from "Gift cards," or how a card gets consumed by an expense |
| **Total** | | **17/40** | **Poor** |

## Design Specificity Verdict

**Design review:** Reads as a generic "manage a list of cards with a balance" CRUD screen wearing Parkday's colors, not a feature built around the emotional reality of Disney gift funds. No field for who gave the card, despite PRODUCT.md framing this as family/collaborator money. DESIGN.md's "keepsake" identity shows up only in the hero block; the add/edit flow is off-the-shelf form plumbing with an incorrect accent color.

**Deterministic scan:** CLI `detect.mjs` scan was clean (0 findings) across all four files. Live overlay (`impeccableScanAsync`) returned 21 raw findings: 17 undersized-ui-text (mostly the documented 9px Micro tier / 10-10.5px Label tier repeated across hero stats, last-4 pills, and bottom nav — not independent problems), 2 ai-color-palette, 1 low-contrast, 1 overused-font (app-wide, false positive), 1 cream-palette (app-wide, false positive). The low-contrast finding and one ai-color-palette flag both land on the same hero-footer figures the design review independently flagged as decoratively colored — genuine convergence.

**Visual overlays:** No overlay left running; Assessment B stopped the live-server injection after capturing the scan.

## Overall Impression

The hero block is a real, on-brand highlight, but everything past it regresses to generic form-and-list plumbing. Both assessments converged independently on the same problem: the hero's three-stat footer uses color decoratively instead of semantically, and one of those colors literally fails WCAG contrast. Layered on top: a live-reproducible broken state ("$2,020 of $0 goal · 0% there") and a risky one-tap, no-confirmation delete on money the product frames as sentimental.

## What's Working

- The hero block's information layering — label/value/progress-bar/footer-stats in one navy card is well-composed and on-brand; the dashed-underline "tap to edit" goal figure is a nice low-friction inline-edit affordance.
- Struck-through original amount on depleted cards preserves history instead of just deleting the number.
- "View N uses of this card" is genuinely good progressive disclosure — appears only when relevant, links straight to the underlying expense.

## Priority Issues

**[P0] No confirmation before deleting a gift card.** GiftCardSheet.jsx deletes immediately on trash-icon click — no undo, no "are you sure," for money framed as coming from family/collaborators. Why it matters: an accidental tap permanently erases a record of someone's gift with zero recovery. Fix: add the same two-tap confirm pattern already used in Wishlist's remove flow. Suggested command: /impeccable harden

**[P1] Primary Save button uses the wrong accent color, breaking DESIGN.md's core button rule.** GiftCardSheet.module.css and RewardSheet.module.css style Save with var(--sky); sibling ExpenseSheet.module.css correctly uses var(--gold) for the same primary-commitment role. Fix: change .saveBtn to gold background / navy text in both files. Suggested command: /impeccable polish

**[P1] Hero footer misuses color semantically, and one figure fails contrast.** Total/Spent/Remaining use gold/coral/teal decoratively (violating the Semantic-Only Rule); the coral "Spent" figure measures 4.1:1 against navy, below the 4.5:1 AA requirement. Two independent assessments landed on the same numbers from different directions. Fix: move these to neutral navy/ink tones, reserve coral for an actual problem state. Suggested command: /impeccable audit

**[P1] Broken, live-reproduced copy when no savings goal is set.** With goal=$0 and totalValue=$2,020, the hero renders "$2,020 of $0 goal · 0% there" — confirmed live, not hypothetical. Fix: branch copy when goal === 0. Suggested command: /impeccable harden

**[P2] Mobile layout doesn't fill the viewport at 375px.** Content column leaves a persistent ~60-80px cream gap on the right edge at 375px while the bottom nav spans full width. Fix: audit the page's outer container width rules against other pages that fill correctly at the same breakpoint. Suggested command: /impeccable adapt

## Persona Red Flags

**Jordan (First-Timer):** "Source" field doesn't say whether it means who gave it or where it was bought — the datalist mixes both. Jordan will likely try adding a Disney Visa rewards balance under "Add gift card" first since the distinction from "Rewards" is subtle.

**Sam (Accessibility-Dependent):** Field labels are plain divs, not label/htmlFor — no programmatic association. The bottom sheet has no role="dialog", aria-modal, or focus trap. The delete icon has only a title attribute, no aria-label.

**Riley (Stress-Tester):** Confirmed live: the $0-goal broken copy, plus four "Depleted" cards with zero linked expense uses — a card's balance can reach $0 with no expense record ever created. Nothing blocks balance from exceeding original_amount.

## Minor Observations

- A gift card literally named "Disney Rewards" sits directly above the separate "Rewards" section header — reads like a contradiction on a fast scan.
- "Mark depleted" and "Save" sit at a 1:2 flex ratio in the edit sheet — overstates how often the rare, destructive-adjacent action should be reached for.
- fmt() rounds to whole dollars everywhere, so $0.40 and $0 both read as depleted-adjacent.
- Mobile header "Gift Cards & Rewards" wraps to two lines at 375px, crowding the account avatar.

## Questions to Consider

- The hero's three-color footer and the sky-blue Save button both drifted from DESIGN.md's own rules independently — sign this component predates the rules? Worth checking other older sheets the same way?
- If gift funds are meant to feel like family contributions rather than a ledger, what would it take to surface who gave each card?
- Should "Mark depleted" require the same confirmation weight as Delete, given it's similarly hard to undo?
