import { supabase } from '../supabase'
import { categoryMeta } from './categories'

// Seasonal festival booths (e.g. EPCOT Food & Wine kiosks) are physical
// dining locations, so they live under 'restaurant' rather than their own
// category — the seasonal{} field (surfaced as a festival pill) is what
// distinguishes them from a year-round restaurant. The food/drink items
// sold at those booths reuse the existing 'snack' category, since they're
// genuine snack-shaped items (single food/drink, real per-item price).
export const WL_CAT_ORDER = ['ride', 'show', 'restaurant', 'snack', 'experience', 'event', 'misc']
export const WL_CAT_LABEL = { ride: 'Rides', show: 'Shows', restaurant: 'Dining', snack: 'Snacks and Sips', experience: 'Experiences', event: 'Events', misc: 'Misc' }
// Shorter form for the compact catalog-card pill — most categories just
// singularize (Rides -> Ride), but Snacks and Sips reads oddly cut down to
// "Snacks and Sip", so it keeps its full label there.
export const WL_CAT_PILL_LABEL = { ...WL_CAT_LABEL, snack: 'Snacks and Sips' }
for (const key of Object.keys(WL_CAT_PILL_LABEL)) {
  if (key !== 'snack') WL_CAT_PILL_LABEL[key] = WL_CAT_PILL_LABEL[key].replace(/s$/, '')
}
export const WL_CAT_TO_EXPENSE_CAT = { ride: 'll', show: 'experience', restaurant: 'dining', snack: 'snacks', experience: 'experience', event: 'experience', misc: 'misc' }

export const WL_PARK_LABEL = {
  MK: 'Magic Kingdom', EPCOT: 'EPCOT', HS: 'Hollywood Studios', AK: 'Animal Kingdom', DS: 'Disney Springs',
  TL: 'Typhoon Lagoon', BB: 'Blizzard Beach',
  CR: 'Contemporary', GF: 'Grand Floridian', POLY: 'Polynesian', WL: 'Wilderness Lodge',
  AKL: 'Animal Kingdom Lodge', BC: 'Beach Club', YC: 'Yacht Club', BW: 'BoardWalk', RIV: 'Riviera Resort',
  SS: 'Saratoga Springs', OKW: 'Old Key West', POFQ: 'Port Orleans French Quarter', PORS: 'Port Orleans Riverside',
  CBR: 'Caribbean Beach', CSR: 'Coronado Springs', FW: 'Fort Wilderness', SWD: 'Swan & Dolphin', VALUE: 'Value Resorts',
}

// Grouped for the catalog filter dropdown — a flat list of 20+ parks/resorts
// is too much to scan, so it's split into Parks / Water Parks / Disney Springs / Resorts.
export const WL_PARK_GROUPS = [
  { label: 'Parks', options: ['MK', 'EPCOT', 'HS', 'AK'] },
  { label: 'Water Parks', options: ['TL', 'BB'] },
  { label: 'Disney Springs', options: ['DS'] },
  {
    label: 'Resorts',
    options: ['CR', 'GF', 'POLY', 'WL', 'AKL', 'BC', 'YC', 'BW', 'RIV', 'SS', 'OKW', 'POFQ', 'PORS', 'CBR', 'CSR', 'FW', 'SWD', 'VALUE'],
  },
]

export const LL_TIER_LABEL = {
  single_pass: 'Single Pass',
  multi_pass_tier1: 'Multi Pass · Tier 1',
  multi_pass_tier2: 'Multi Pass · Tier 2',
  multi_pass: 'Multi Pass',
  standby_only: 'Standby only',
}

// The expense's ll_type (multipass/singlepass/premierpass — what the user
// actually books, editable in the expense sheet) and a ride's catalog
// lightning_lane_tier (its real tier classification, e.g. "Multi Pass ·
// Tier 2") are different concepts that usually agree. This maps a catalog
// tier to the ll_type it implies, so a freshly-added ride starts with the
// right selection instead of the expense sheet's 'multipass' default, and
// so a matching pair can be deduped down to one pill instead of two.
export function llTierToExpenseType(tier) {
  if (tier === 'single_pass') return 'singlepass'
  if (tier === 'standby_only') return null
  if (tier === 'multi_pass' || tier === 'multi_pass_tier1' || tier === 'multi_pass_tier2') return 'multipass'
  return null
}

export const DINING_TIER_LABEL = {
  signature: 'Signature',
  character_dining: 'Character Dining',
  table_service: 'Table Service',
  lounge_bar: 'Lounge / Bar',
  quick_service: 'Quick Service',
  pool_bar: 'Pool Bar',
  snack_kiosk: 'Snack / Kiosk',
  dinner_show: 'Dinner Show',
}

export const ITEM_TYPE_LABEL = { food: 'Food', drink: 'Drink', both: 'Food & Drink' }

const CATALOG_FIELDS = 'name, park, category, description, price_label, price_mid, lightning_lane_tier, dining_tier, cuisine, dining_plan_credits, seasonal, tags, location_detail, item_type, booth_id'
const WISH_ITEM_FIELDS = 'name, park, category, price_label, price_mid, notes, custom, planned_expense_id, planned_day, favorited_by, lightning_lane_tier, dining_tier, cuisine, dining_plan_credits, seasonal, tags, location_detail, item_type, booth_id'

// 'MM-DD' -> 'Aug 27' for display, independent of year.
function fmtMonthDay(md) {
  const [m, d] = md.split('-').map(Number)
  return new Date(2001, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Null when the given trip date ('YYYY-MM-DD') falls inside the item's
// seasonal window, else a warning string to surface to the user. Compares
// month-day only (seasonal{} carries no year) and handles a window that
// wraps the new year (e.g. a Nov-Jan holiday festival).
export function seasonalWarning(seasonal, dateStr) {
  if (!seasonal?.start || !seasonal?.end || !dateStr) return null
  const md = dateStr.slice(5)
  const { start, end } = seasonal
  const inWindow = start <= end ? (md >= start && md <= end) : (md >= start || md <= end)
  if (inWindow) return null
  return `This item is only available during ${seasonal.festival} (${fmtMonthDay(start)}–${fmtMonthDay(end)}).`
}

// Wish list categories reuse the same icon/color as the expense category
// they map to, so the catalog and the itinerary/budget stay visually
// consistent without duplicating a second color system.
export function wlCatMeta(catKey) {
  const expenseCat = WL_CAT_TO_EXPENSE_CAT[catKey] || 'misc'
  const m = categoryMeta(expenseCat)
  return { label: WL_CAT_LABEL[catKey] || catKey, icon: m.icon, color: m.color, bg: m.bg, expenseCat }
}

// Reverse of WL_CAT_TO_EXPENSE_CAT: which wish-list catalog categories feed
// a given expense category. Built once from the forward map so the two
// never drift out of sync.
const EXPENSE_TO_WL_CATS = Object.entries(WL_CAT_TO_EXPENSE_CAT).reduce((acc, [wlCat, expenseCat]) => {
  (acc[expenseCat] ||= []).push(wlCat)
  return acc
}, {})

// Catalog items relevant to an expense-sheet category, for a label
// typeahead — e.g. picking 'dining' surfaces restaurants, 'll' surfaces
// rides. Returns [] for categories with no catalog equivalent (Resort,
// Travel, Transport…).
export function catalogItemsForExpenseCat(catalog, expenseCat) {
  const wlCats = EXPENSE_TO_WL_CATS[expenseCat]
  if (!wlCats || !catalog?.length) return []
  return catalog.filter(c => wlCats.includes(c.category))
}

export function priceBucket(mid) {
  if (mid <= 0) return 'free'
  if (mid < 50) return 'under50'
  if (mid <= 150) return '50to150'
  return 'over150'
}

export async function fetchCatalog() {
  const { data, error } = await supabase
    .from('catalog_items')
    .select(`id, ${CATALOG_FIELDS}`)
    .eq('active', true)
    .order('name')

  return { data: data ?? [], error }
}

export async function fetchWishList(userId, tripId) {
  const { data, error } = await supabase
    .from('wish_list_items')
    .select(`id, catalog_id, ${WISH_ITEM_FIELDS}`)
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .order('created_at')

  return { data: data ?? [], error }
}

export async function addCatalogItemToWishList(userId, tripId, item) {
  const { data, error } = await supabase
    .from('wish_list_items')
    .insert({
      user_id: userId, trip_id: tripId, catalog_id: item.id, custom: false,
      name: item.name, park: item.park, category: item.category,
      price_label: item.price_label, price_mid: item.price_mid, lightning_lane_tier: item.lightning_lane_tier ?? null,
      dining_tier: item.dining_tier ?? null, cuisine: item.cuisine ?? null, dining_plan_credits: item.dining_plan_credits ?? null,
      seasonal: item.seasonal ?? null, tags: item.tags ?? null, location_detail: item.location_detail ?? null,
      item_type: item.item_type ?? null, booth_id: item.booth_id ?? null,
    })
    .select(`id, catalog_id, ${WISH_ITEM_FIELDS}`)
    .single()

  return { data, error }
}

export async function addCustomWishListItem(userId, tripId, fields) {
  const { data, error } = await supabase
    .from('wish_list_items')
    .insert({ user_id: userId, trip_id: tripId, catalog_id: null, custom: true, ...fields })
    .select(`id, catalog_id, ${WISH_ITEM_FIELDS}`)
    .single()

  return { data, error }
}

export async function removeWishListItemByCatalogId(userId, tripId, catalogId) {
  const { error } = await supabase
    .from('wish_list_items')
    .delete()
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .eq('catalog_id', catalogId)

  return { error }
}

export async function deleteWishListItem(id) {
  const { error } = await supabase.from('wish_list_items').delete().eq('id', id)
  return { error }
}

export async function updateWishListItem(id, fields) {
  const { data, error } = await supabase
    .from('wish_list_items')
    .update(fields)
    .eq('id', id)
    .select(`id, catalog_id, ${WISH_ITEM_FIELDS}`)
    .single()

  return { data, error }
}
