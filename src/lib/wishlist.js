import { supabase } from '../supabase'
import { categoryMeta } from './categories'

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
  CR: 'Contemporary', GF: 'Grand Floridian', POLY: 'Polynesian', WL: 'Wilderness Lodge',
  AKL: 'Animal Kingdom Lodge', BC: 'Beach Club', YC: 'Yacht Club', BW: 'BoardWalk', RIV: 'Riviera Resort',
  SS: 'Saratoga Springs', OKW: 'Old Key West', POFQ: 'Port Orleans French Quarter', PORS: 'Port Orleans Riverside',
  CBR: 'Caribbean Beach', CSR: 'Coronado Springs', FW: 'Fort Wilderness', SWD: 'Swan & Dolphin', VALUE: 'Value Resorts',
}

// Grouped for the catalog filter dropdown — a flat list of 20+ parks/resorts
// is too much to scan, so it's split into Parks / Disney Springs / Resorts.
export const WL_PARK_GROUPS = [
  { label: 'Parks', options: ['MK', 'EPCOT', 'HS', 'AK'] },
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

const CATALOG_FIELDS = 'name, park, category, description, price_label, price_mid, lightning_lane_tier, dining_tier, cuisine, dining_plan_credits'
const WISH_ITEM_FIELDS = 'name, park, category, price_label, price_mid, notes, custom, planned_expense_id, planned_day, favorited_by, lightning_lane_tier, dining_tier, cuisine, dining_plan_credits'

// Wish list categories reuse the same icon/color as the expense category
// they map to, so the catalog and the itinerary/budget stay visually
// consistent without duplicating a second color system.
export function wlCatMeta(catKey) {
  const expenseCat = WL_CAT_TO_EXPENSE_CAT[catKey] || 'misc'
  const m = categoryMeta(expenseCat)
  return { label: WL_CAT_LABEL[catKey] || catKey, icon: m.icon, color: m.color, bg: m.bg, expenseCat }
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
