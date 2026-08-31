export const CATEGORY_META = {
  package:    { label: 'Resort Package',  icon: 'ti-building-castle',  color: 'var(--night)',     bg: 'rgba(13,35,64,0.1)',   prog: 'var(--night)',     scope: 'trip' },
  resort:     { label: 'Accommodations',  icon: 'ti-building-castle',  color: 'var(--night)',     bg: 'rgba(13,35,64,0.1)',   prog: 'var(--night)',     scope: 'trip' },
  tickets:    { label: 'Park Tickets',    icon: 'ti-ticket',           color: 'var(--gold-dark)', bg: 'rgba(245,181,54,0.15)',prog: 'var(--gold)',      scope: 'trip' },
  travel:     { label: 'Travel',          icon: 'ti-plane',            color: 'var(--sky)',       bg: 'rgba(42,111,224,0.12)',prog: 'var(--sky)',       scope: 'trip' },
  dining:     { label: 'Dining',          icon: 'ti-tools-kitchen-2',  color: 'var(--coral)',     bg: 'rgba(224,83,63,0.12)', prog: 'var(--coral)',     scope: 'day' },
  snacks:     { label: 'Snacks',          icon: 'ti-ice-cream',        color: 'var(--coral)',     bg: 'rgba(224,83,63,0.08)', prog: 'var(--coral)',     scope: 'day' },
  experience: { label: 'Experiences',     icon: 'ti-stars',            color: 'var(--gold-dark)', bg: 'rgba(245,181,54,0.15)',prog: 'var(--gold)',      scope: 'day' },
  ll:         { label: 'Lightning Lane',  icon: 'ti-bolt',             color: 'var(--teal-dark)', bg: 'rgba(44,165,141,0.18)',prog: 'var(--teal)',      scope: 'day' },
  souvenirs:  { label: 'Souvenirs',       icon: 'ti-gift',             color: 'var(--coral)',     bg: 'rgba(224,83,63,0.12)', prog: 'var(--coral)',     scope: 'day' },
  transport:  { label: 'Transport',       icon: 'ti-car',              color: 'var(--sky)',       bg: 'rgba(42,111,224,0.12)',prog: 'var(--sky)',       scope: 'day' },
  misc:       { label: 'Misc',            icon: 'ti-dots',             color: 'var(--text-secondary)', bg: 'var(--border-light)', prog: 'var(--text-secondary)', scope: 'day' },
}

// Base display order. When a trip is booked as a Vacation Package, resort +
// tickets collapse into a single `package` row (see categoriesForTrip).
export const CATEGORY_ORDER = ['resort', 'tickets', 'travel', 'dining', 'snacks', 'experience', 'll', 'souvenirs', 'transport', 'misc']

export const CATS_WITH_TIME = new Set(['dining', 'experience', 'transport', 'travel'])
export const CATS_WITH_STATUS = new Set(['dining', 'experience'])

export const LL_TYPE_LABEL = { multipass: 'Multi Pass', singlepass: 'Single Pass', premierpass: 'Premier Pass' }

// Superseded cat keys from an earlier schema, kept so already-saved rows
// (e.g. trips created before this categories rework) still resolve.
const CAT_ALIASES = { accommodations: 'resort', lightning_lane: 'll', experiences: 'experience' }

export function normalizeCat(cat) {
  return CAT_ALIASES[cat] || cat
}

export function categoryMeta(cat) {
  const key = normalizeCat(cat)
  return CATEGORY_META[key] || { label: cat, icon: 'ti-dots', color: 'var(--text-tertiary)', bg: 'var(--border-light)', prog: 'var(--text-tertiary)', scope: 'day' }
}

// Identifies the configurator-seeded "budget target" row for a category —
// the one whose planned_amt the inline budget editor updates. Flagged
// explicitly via is_budget rather than inferred from day/label, since a
// real expense entry can otherwise look identical to a budget row (e.g. a
// flight under Travel also has day=null).
export function findBudgetRow(rows, cat) {
  return rows.find(r => r.cat === cat && r.is_budget) || null
}

// Aggregates a category's rows into { budgetRow, budgeted, planned, actual, count }.
// `planned`/`count` only reflect real transactions — the budget target row
// itself isn't a transaction, so it's excluded from those (a category with
// no logged expenses should show $0 planned, not the budgeted amount).
// `actual` also folds in the budget row's own actual_amt: every other
// category's budget row never has one (only real entries carry actual_amt),
// but the `package` category's budget row is the one place Trip Funds
// payments sync a total-paid amount directly onto (see supabase payments
// triggers) — there's no separate "entry" to log a package payment against.
export function categoryTotals(rows, cat) {
  const budgetRow = findBudgetRow(rows, cat)
  const entries = rows.filter(r => r !== budgetRow && !r.no_cost)
  return {
    budgetRow,
    budgeted: budgetRow?.planned_amt || 0,
    planned: entries.reduce((s, e) => s + (e.planned_amt || 0), 0),
    actual: entries.filter(e => e.actual_amt != null).reduce((s, e) => s + e.actual_amt, 0) + (budgetRow?.actual_amt || 0),
    count: entries.length,
  }
}

export function isPackageBooking(trip) {
  return trip?.booking_type === 'package' || trip?.booking_type === 'package_dining'
}

// The category key list actually used for a given trip: swaps resort+tickets
// for a single `package` category when the trip was booked as a bundle.
export function categoriesForTrip(trip) {
  if (isPackageBooking(trip)) return ['package', 'travel', 'dining', 'snacks', 'experience', 'll', 'souvenirs', 'transport', 'misc']
  return CATEGORY_ORDER
}
