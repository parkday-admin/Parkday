import { supabase } from '../supabase'
import { categoryMeta } from './categories'

export const WL_CAT_ORDER = ['ride', 'show', 'restaurant', 'snack', 'experience', 'event', 'misc']
export const WL_CAT_LABEL = { ride: 'Rides', show: 'Shows', restaurant: 'Restaurants', snack: 'Snacks & Sips', experience: 'Experiences', event: 'Events', misc: 'Misc' }
export const WL_CAT_TO_EXPENSE_CAT = { ride: 'll', show: 'experience', restaurant: 'dining', snack: 'snacks', experience: 'experience', event: 'experience', misc: 'misc' }
export const WL_PARK_LABEL = { MK: 'Magic Kingdom', EPCOT: 'EPCOT', HS: 'Hollywood Studios', AK: 'Animal Kingdom', Resort: 'Resort' }

export const LL_TIER_LABEL = {
  single_pass: 'Single Pass',
  multi_pass_tier1: 'Multi Pass · Tier 1',
  multi_pass_tier2: 'Multi Pass · Tier 2',
  multi_pass: 'Multi Pass',
  standby_only: 'Standby only',
}

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
    .select('id, name, park, category, description, price_label, price_mid, lightning_lane_tier')
    .eq('active', true)
    .order('name')

  return { data: data ?? [], error }
}

export async function fetchWishList(userId, tripId) {
  const { data, error } = await supabase
    .from('wish_list_items')
    .select('id, catalog_id, name, park, category, price_label, price_mid, notes, custom, planned_expense_id, planned_day, favorited_by, lightning_lane_tier')
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
    })
    .select('id, catalog_id, name, park, category, price_label, price_mid, notes, custom, planned_expense_id, planned_day, lightning_lane_tier')
    .single()

  return { data, error }
}

export async function addCustomWishListItem(userId, tripId, fields) {
  const { data, error } = await supabase
    .from('wish_list_items')
    .insert({ user_id: userId, trip_id: tripId, catalog_id: null, custom: true, ...fields })
    .select('id, catalog_id, name, park, category, price_label, price_mid, notes, custom, planned_expense_id, planned_day, lightning_lane_tier')
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
    .select('id, catalog_id, name, park, category, price_label, price_mid, notes, custom, planned_expense_id, planned_day, favorited_by, lightning_lane_tier')
    .single()

  return { data, error }
}
