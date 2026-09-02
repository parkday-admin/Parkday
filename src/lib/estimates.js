import { supabase } from '../supabase'
import resorts from '../data/resorts.json'
import { RESORT_RATES, TPD, TPD_CHILD, PH, LLR, MEAL } from '../components/Estimator/estimatorData'
import { bkt } from '../components/Estimator/estimatorLogic'

export async function fetchEstimates(userId) {
  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  return { data: data ?? [], error }
}

export async function createEstimate(userId, fields) {
  const { data, error } = await supabase
    .from('estimates')
    .insert({ user_id: userId, ...fields })
    .select()
    .single()

  return { data, error }
}

export async function renameEstimate(id, name) {
  const { data, error } = await supabase
    .from('estimates')
    .update({ name })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function deleteEstimate(id) {
  const { error } = await supabase.from('estimates').delete().eq('id', id)
  return { error }
}

export function nextEstimateName(existingEstimates) {
  for (let i = 1; i <= 3; i++) {
    const name = `Estimate ${i}`
    if (!existingEstimates.some(e => e.name === name)) return name
  }
  return `Estimate ${existingEstimates.length + 1}`
}

// Estimator state (S.resort/S.ticket/S.ll) uses its own short codes — this
// maps them onto the estimates table's values, which read more like the
// configurator's own field values so a saved row is legible on its own.
const RESORT_TO_ROW = { value: 'value', moderate: 'moderate', deluxe: 'deluxe', villa: 'deluxe_villa', offsite: 'off_property' }
const TICKET_TO_ROW = { base: 'base', wpas: 'water_park', hopper: 'hopper', hopperplus: 'hopper_plus' }
const LL_TO_ROW = { none: 'none', multipass: 'multi_pass', singles: 'mp_plus_singles', premierpass: 'premier_pass' }

export function estimatorStateToRow(S, skipped, c, tv) {
  return {
    adults: S.adults,
    children: S.children,
    nights: S.nights,
    park_days: S.parkdays,
    season: S.season,
    resort_tier: RESORT_TO_ROW[S.resort] || null,
    travel_mode: skipped.travel ? 'skip' : S.travel,
    travel_cost_lo: skipped.travel ? 0 : Math.round(tv.lo),
    travel_cost_hi: skipped.travel ? 0 : Math.round(tv.hi),
    ticket_type: TICKET_TO_ROW[S.ticket] || 'base',
    lightning_lane: LL_TO_ROW[S.ll] || 'none',
    dining_qs: S.qs,
    dining_ts: S.ts,
    dining_character: S.character,
    dining_snacks: S.snacks,
    souvenirs: S.souvenirs,
    experiences: S.experiences,
    cost_lo: Math.round(c.totalLo),
    cost_hi: Math.round(c.totalHi),
    cost_midpoint: Math.round(c.total),
  }
}

const TICKET_TO_CFG = { base: 'base', water_park: 'water_sports', hopper: 'hopper', hopper_plus: 'hopper_plus' }
const LL_TO_CFG = { none: 'none', multi_pass: 'multipass', mp_plus_singles: 'singles', premier_pass: 'premierpass' }

// Estimates are rough scenarios with no real travel dates, so this seeds the
// configurator with a placeholder arrival of today (+ nights) — the user
// still has to pick their real dates in the configurator itself.
export function rowToConfiguratorPrefill(row) {
  const today = new Date()
  const arrival = today.toISOString().slice(0, 10)
  const departure = row.nights > 0
    ? new Date(today.getTime() + row.nights * 86400000).toISOString().slice(0, 10)
    : arrival

  const isOffProperty = row.resort_tier === 'off_property'
  const tier = isOffProperty ? '' : (row.resort_tier === 'deluxe_villa' ? 'villa' : row.resort_tier || '')
  const matchedResort = tier ? resorts.find(r => r.tier === tier && r.tl !== 'Swan & Dolphin') : null

  return {
    extraAdults: row.adults,
    extraChildren: row.children,
    arrival,
    departure,
    ticketType: TICKET_TO_CFG[row.ticket_type] || 'base',
    lightningLane: LL_TO_CFG[row.lightning_lane] || 'none',
    travel: row.travel_mode === 'driving' ? 'driving' : 'flying',
    tier: isOffProperty ? 'off_property' : (matchedResort?.tier || ''),
    accName: isOffProperty ? '' : (matchedResort?.name || ''),
    isOffProperty,
  }
}

const ROW_TO_RESORT_RATE_KEY = { value: 'value', moderate: 'moderate', deluxe: 'deluxe', deluxe_villa: 'villa', off_property: 'offsite' }
const ROW_TO_TICKET_RATE_KEY = { base: 'base', water_park: 'wpas', hopper: 'hopper', hopper_plus: 'hopperplus' }
const ROW_TO_LL_RATE_KEY = { none: 'none', multi_pass: 'multipass', mp_plus_singles: 'singles', premier_pass: 'premierpass' }

const mid = ({ lo, hi }) => Math.round((lo + hi) / 2)

// Only the trip total is persisted per estimate, not a per-category
// breakdown — this recomputes each category's rough cost from the row's own
// saved inputs, using the same rate tables the estimator itself reads from,
// so the comparison grid can show a price next to each selection.
export function estimateCategoryCosts(row) {
  const t = (row.adults || 0) + (row.children || 0)
  const season = row.season || 'value'
  const nights = row.nights || 0
  const parkDays = row.park_days || 0

  const resortKey = ROW_TO_RESORT_RATE_KEY[row.resort_tier]
  const r = resortKey ? RESORT_RATES[resortKey][season] : null
  const accommodations = r ? { lo: r[0] * nights, hi: r[1] * nights } : null

  const bk = bkt(parkDays)
  const tp = TPD[season]?.[bk]
  const tpc = TPD_CHILD[season]?.[bk]
  const ph = PH[ROW_TO_TICKET_RATE_KEY[row.ticket_type] || 'base']
  const pAdLo = (tp[0] + ph[0]) * parkDays, pAdHi = (tp[1] + ph[1]) * parkDays
  const pChLo = (tpc[0] + ph[0]) * parkDays, pChHi = (tpc[1] + ph[1]) * parkDays
  const tickets = { lo: pAdLo * (row.adults || 0) + pChLo * (row.children || 0), hi: pAdHi * (row.adults || 0) + pChHi * (row.children || 0) }

  const ll = LLR[ROW_TO_LL_RATE_KEY[row.lightning_lane] || 'none']
  const lightningLane = { lo: ll[0] * t * parkDays, hi: ll[1] * t * parkDays }

  const qsLo = MEAL.qs[0] * row.dining_qs * t * parkDays, qsHi = MEAL.qs[1] * row.dining_qs * t * parkDays
  const tsLo = MEAL.ts[0] * row.dining_ts * t * parkDays, tsHi = MEAL.ts[1] * row.dining_ts * t * parkDays
  const chLo = MEAL.character[0] * row.dining_character * t, chHi = MEAL.character[1] * row.dining_character * t
  const snLo = MEAL.snack[0] * row.dining_snacks * t * parkDays, snHi = MEAL.snack[1] * row.dining_snacks * t * parkDays
  const tipsLo = (tsLo + chLo) * 0.18, tipsHi = (tsHi + chHi) * 0.2
  const dining = { lo: qsLo + tsLo + chLo + snLo + tipsLo, hi: qsHi + tsHi + chHi + snHi + tipsHi }

  return {
    accommodations: accommodations ? mid(accommodations) : null,
    tickets: mid(tickets),
    lightningLane: mid(lightningLane),
    dining: mid(dining),
  }
}
