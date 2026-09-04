# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Families planning an upcoming Disney World (or similar Disney-brand) vacation. Primary users are the trip organizer(s) within a family or travel group who need to budget, plan, and coordinate the trip — often collaborating with other family members/collaborators on the same trip.

## Product Purpose

Parkday is an all-in-one financial and logistics planner for a Disney vacation: estimating and tracking trip costs (tickets, Lightning Lane/Genie+, dining, resort/lodging, Annual Passes, extras/experiences), managing a running budget against that estimate, and coordinating the surrounding logistics (packing lists, reminders, gift funds/payments, itinerary) so the trip stays on budget and organized.

## Positioning

Not a generic budgeting spreadsheet and not a general trip-planning/touring app (e.g. TouringPlans, MouseAI). Parkday's mechanism is deep, Disney-cost-specific financial planning — a detailed, itemized cost estimator/configurator purpose-built around real Disney pricing categories (park tickets, Lightning Lane options, dining plans, resort tiers, Annual Passes, add-on experiences) combined with live budget tracking, gifting/payment tools, and family collaboration in one connected app, rather than a loose collection of generic planning features.

## Operating Context

- Users configure a trip (dates, resort, party/family members, ticket types) and get a cost estimate broken into categories.
- Ongoing budget tracking against that estimate as real expenses/payments occur, including gift card funds and shared/collaborator payments.
- Supporting workflows: packing lists, reminders, itinerary, and account/trip settings (including multi-trip and archived trips).
- Installable as a PWA; iOS install prompting exists, indicating mobile-first/on-the-go usage during planning and likely during the trip itself.
- Built on React + Vite, with Supabase for backend/auth/data and Stripe for payments.

## Capabilities and Constraints

- Multi-person/family-member modeling (per-person ticket types, Annual Pass status, etc.).
- Detailed catalogs already exist for Lightning Lane/Premier Pass, Annual Pass holder pricing, MNSSHP-style party tickets, and a broad Events/Experiences ("Enchanting Extras") catalog — cost data is a core, maintained asset of the product.
- Collaboration/invite flow between trip members (invite accept, collaborator roles) and paywall/payment gating exist in the app.
- Must not imply official Disney affiliation, sponsorship, or endorsement, and must avoid using Disney's trademarks, character likenesses, or proprietary fonts/marks directly.

## Brand Commitments

Product name: Parkday.

## Evidence on Hand

- Working production React app (`src/`) covering Dashboard, Budget, Estimator, Configurator, Packing, Gifts, Reminders, Itinerary, Account/Trip Settings, Payments, Paywall, and archived-trip views.
- Several standalone HTML prototypes/mockups in `public/` (configurator, estimator, planner, pricing, account, home) representing earlier or exploratory visual iterations — not confirmed as current production UI.
- No customer testimonials, case studies, or press on hand; do not fabricate these.

## Product Principles

- Model real Disney trip costs with enough granularity that the estimate is trustworthy, not a rough guess.
- Keep budgeting, planning, and logistics (packing, reminders, itinerary) connected in one place rather than siloed tools.
- Support collaborative, multi-person trip planning, not just a single user's spreadsheet.
- Never claim or imply Disney affiliation, endorsement, or sponsorship.
