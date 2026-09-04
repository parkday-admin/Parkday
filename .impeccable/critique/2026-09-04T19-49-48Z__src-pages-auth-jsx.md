---
target: Login/Auth
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Auth.jsx"
target_fingerprint: "sha256:bfdd748fc8efbcac3342019d7bd114d678c3f1f97e43cd484f109d1509ae61fd"
target_path: "C:\\Users\\nacst\\Documents\\parkday\\src\\pages\\Auth.jsx"
timestamp: 2026-09-04T19-49-48Z
slug: src-pages-auth-jsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading copy exists ("Please wait…", "Redirecting…") but error/notice text has no `aria-live`/`role="alert"` |
| 2 | Match System / Real World | 4 | Plain familiar copy, headline ties to the real use case ("plan your park day") |
| 3 | User Control and Freedom | 3 | Mode switches and "Back to sign in" exist; no visible way to cancel an in-flight submit |
| 4 | Consistency and Standards | 3 | Primary/secondary buttons match DESIGN.md's own contract exactly, but `.forgotLink` deviates from the doc's own named example for that element |
| 5 | Error Prevention | 2 | No confirm-password field on signup; signup's 6-char minimum is inconsistent with reset-password's 8-char minimum |
| 6 | Recognition Rather Than Recall | 4 | Real `<label>` elements throughout, not placeholder-only fields |
| 7 | Flexibility and Efficiency | 3 | Correct per-mode `autocomplete` (`new-password` vs `current-password`) aids password managers; no passwordless option |
| 8 | Aesthetic and Minimalist Design | 3 | Clean and uncluttered, but reads as under-designed relative to the brand promise rather than intentionally restrained |
| 9 | Error Recovery | 2 | Sign-in/signup surfaces raw Supabase `error.message` verbatim, no product-voiced guidance |
| 10 | Help and Documentation | 1 | No terms/privacy link at account creation, no trust/security reassurance for a screen guarding financial-planning data |
| **Total** | | **28/40** | **Good — solid foundation, address weak areas** |

## Design Specificity Verdict

**LLM assessment:** Strip the gold submit button and the Fraunces headline and this is an interchangeable SaaS auth card — white rounded card, OAuth button, divider, two labeled inputs, CTA, toggle link — the skeleton of a thousand other products. The one genuinely Parkday-specific element is the `estimateChip` ([Auth.jsx:159-169](src/pages/Auth.jsx:159)): a small teal-accented callout surfacing the visitor's saved Estimator output ("Your estimate is saved — 2 adults + 1 kid, 5 nights") so a first-time visitor arriving from the funnel sees continuity rather than a wall. That's a real, product-aware decision. Everything else — no stamp/ticket motif, no illustration, no motion, no reassurance copy about handling a family's trip money — reads as tokens-applied-to-a-template rather than a screen built outward from "The Park Ticket" concept the way the dashboard's navy hero block is.

**Deterministic scan:** `detect.mjs` returned `[]` (exit 0) across `Auth.jsx`, `Auth.module.css`, and `ResetPassword.jsx` — clean, no findings. Auth.module.css's 23px Fraunces headline sits exactly at the low end of DESIGN.md's documented Headline range (23–28px) — intentional and in-spec, not drift. No hardcoded off-token colors anywhere except the Google "G" logo's four fixed brand colors (correctly exempt — Google's mark can't be retokenized).

**Visual overlays:** No injected overlay script was run; evidence came from direct screenshot, accessibility-tree, and DOM inspection at both desktop (1026px) and mobile (375×812) instead.

## Overall Impression

Structurally sound and accessible in the ways that are easy to get right (real labels, correct per-mode autocomplete, correct button-contract compliance) but the screen has almost no authored identity, and the two places it touches a user's stress state — auth errors and password recovery — are exactly where it's weakest. The `estimateChip` proves the team knows how to make this screen product-specific; it just wasn't followed through everywhere else. Biggest opportunity: the error/trust path, since it's the moment a user is most anxious about an account that will hold their family's vacation budget.

## What's Working

1. **The `estimateChip` continuity device** ([Auth.jsx:159-169](src/pages/Auth.jsx:159)) — the one element built outward from the product rather than a template; reuses the Serif-Is-a-Number rule correctly and reassures a funnel visitor their in-progress plan wasn't lost behind the account wall.
2. **Correct primary/secondary button contract compliance** — the submit button ([Auth.module.css:233-245](src/pages/Auth.module.css:233)) is exactly DESIGN.md's documented primary spec, and `.googleBtn` ([Auth.module.css:111-126](src/pages/Auth.module.css:111)) is exactly the documented secondary spec. No "two gold buttons on one screen" violation anywhere in the flow.
3. **Mode-aware `autocomplete`** ([Auth.jsx:207](src/pages/Auth.jsx:207): `new-password` on signup, `current-password` on login) — a detail most login forms skip, and it materially helps password managers behave correctly.

## Priority Issues

**[P1] Error/notice text has no live-region announcement**
- **Why it matters:** `<p className={styles.error}>{error}</p>` and `.notice` ([Auth.jsx:217-218](src/pages/Auth.jsx:217), same pattern in `ResetPassword.jsx:138`) render as plain paragraphs with no `aria-live`/`role="alert"` — confirmed absent in the live accessibility tree. A screen-reader user who submits wrong credentials gets total silence: the form appears to do nothing.
- **Fix:** Add `role="alert"` to `.error` and `aria-live="polite"` to `.notice`; consider moving focus to the message on failure.
- **Suggested command:** `/impeccable harden`

**[P1] Auth error copy is raw, untranslated Supabase text**
- **Why it matters:** `setError(error.message)` ([Auth.jsx:47, 53](src/pages/Auth.jsx:47)) passes Supabase's own strings (e.g. "Invalid login credentials") straight to the UI. DESIGN.md is explicit that the system stays "warm and reassuring on purpose" specifically because this app touches families' vacation money — this is the one place that principle is most visibly abandoned, at exactly the moment a user is most anxious.
- **Fix:** Map known Supabase auth error codes to Parkday-voiced copy with a friendly fallback for unmapped ones (e.g. "That email and password don't match — try again, or reset your password.").
- **Suggested command:** `/impeccable clarify`

**[P2] "Forgot password?" contradicts DESIGN.md's own spec and is hard to see or tap**
- **Why it matters:** DESIGN.md's Buttons section explicitly names "forgot password" as an example of the sky-colored tertiary link pattern, but `.forgotLink` ([Auth.module.css:203](src/pages/Auth.module.css:203)) is `var(--text-tertiary)` (42%-opacity navy) by default, only shifting to sky on hover — useless on touch. Measured live, its clickable area is only **14px tall** despite `display:block; width:100%`, well under the 44px guideline, sitting in a cramped `-6px 0 14px` margin next to the password field. This is the one recovery path for a locked-out user.
- **Fix:** Default to `var(--sky)` per the doc's own spec; add vertical padding so the tap target reaches ~44px.
- **Suggested command:** `/impeccable audit`

**[P2] Zero authored brand personality beyond token application**
- **Why it matters:** No stamp/ticket motif, no illustration, no motion (DESIGN.md names "gentle motion" as part of the system's warmth — none is present here), no trust/security copy anywhere on the screen a family uses to protect their vacation-budget account. PRODUCT.md positions Parkday as deliberately not a generic tool; this is the most frequent touchpoint, and right now it would survive a wordmark swap into any other product unchanged.
- **Fix:** Introduce one signature device (a compact reuse of the navy stamp block, or a ticket-stub edge treatment on the card) plus one line of trust copy near the CTA.
- **Suggested command:** `/impeccable delight`

**[P3] Password entry UX is inconsistent and under-guarded across the two auth surfaces**
- **Why it matters:** Signup enforces `minLength={6}` ([Auth.jsx:206](src/pages/Auth.jsx:206)) with no confirm-password field, while `ResetPassword.jsx` enforces 8 with a confirm field ([ResetPassword.jsx:119, 133, 42-45](src/pages/ResetPassword.jsx:119)) — a user can set a 6-char password at signup that later can't be reused verbatim during reset, and a mistyped signup password is invisible until the next failed login. Neither field has a show/hide toggle, confirmed absent in both the DOM and live render, so a user can't visually verify what they typed before submitting either form. The login placeholder's 8 dots (`••••••••`) also visually implies an 8-character convention that doesn't match the real 6-character signup minimum.
- **Fix:** Add a confirm-password field to signup, reconcile the minimum length across both flows, and add a show/hide toggle to both password inputs.
- **Suggested command:** `/impeccable harden`

## Persona Red Flags

**Sam (Accessibility)**: `.error`/`.notice` have no `aria-live`/`role="alert"` — confirmed in both source and the live accessibility tree. `.forgotLink` at `rgba(13,35,64,.42)` on white, 11.5px, is very likely under WCAG AA 4.5:1 for normal-size text.

**Jordan (First-Timer)**: No special-case handling in `handleSubmit` ([Auth.jsx:44-50](src/pages/Auth.jsx:44)) for "this email is already registered" — a returning visitor who estimated a trip, left, and later clicks "Create account" with the same email gets a raw Supabase string with no guided path back to "Sign in instead." No terms/privacy link shown at account creation despite the account eventually holding payment and family trip data.

**Casey (Mobile)**: Layout itself holds up well at 375×812 — full-width inputs, no horizontal scroll, headline wraps cleanly. But the already-low-contrast `.forgotLink` becomes an even harder target to hit on a touchscreen, compounding the P2 issue above. Email/password inputs measured 40px tall and the submit button 43px — both just under the 44px touch-target guideline.

## Minor Observations

- `handleSubmit` ([Auth.jsx:38-58](src/pages/Auth.jsx:38)) has no `try/catch` around the `await signIn/signUp` calls; supabase-js normally resolves rather than throws on auth failure, but a raw network exception would leave `loading` stuck `true` forever with no way out short of a page reload.
- The `estimateChip`'s `ti-ticket` icon is colored teal ([Auth.module.css:97](src/pages/Auth.module.css:97)) — arguably fine as positive confirmation, but worth a second look against DESIGN.md's Semantic-Only Rule (teal never decorative).
- `GoogleIcon` correctly uses Google's real 4-color mark rather than forcing the app's palette onto it — an appropriate, deliberate exception, not a token violation.
- Card radius (16px) and padding (32px 26px) correctly match DESIGN.md's Card spec.

## Questions to Consider

1. If the entire reason a family trusts Parkday with their vacation budget is that it isn't a generic tool, why is the screen that asks them to trust it with an account the one screen with the least authored identity in the product?
2. The `estimateChip` is the single most Parkday-specific idea on this page — what would the whole login/signup screen look like if it were built outward from "this is where your Disney trip picks back up," instead of a generic auth template with that one element bolted on top?
3. `Auth.jsx` already carries three modes, two independent loading flags, and cross-subdomain session-handoff logic in one component — is keeping login/signup/forgot-password fused actually reducing complexity, or is it what's already producing the inconsistent password-minimum and missing confirm-field gap between it and `ResetPassword.jsx`?
