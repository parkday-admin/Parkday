import { supabase } from '../supabase'
import { fetchWishList, updateWishListItem } from './wishlist'
import { insertPackingItems } from './packing'

const WISH_SELECT = 'id, family_member_id, source, catalog_id, name, park, category, price_label, price_mid, notes, lightning_lane_tier, dining_tier, cuisine, dining_plan_credits'
const PACK_SELECT = 'id, family_member_id, label'

export async function fetchWishFavorites(familyMemberId) {
  const { data, error } = await supabase
    .from('family_member_wish_favorites')
    .select(WISH_SELECT)
    .eq('family_member_id', familyMemberId)
    .order('created_at')

  return { data: data ?? [], error }
}

export async function addCatalogWishFavorite(userId, familyMemberId, item) {
  const { data, error } = await supabase
    .from('family_member_wish_favorites')
    .insert({
      user_id: userId, family_member_id: familyMemberId, source: 'catalog', catalog_id: item.id,
      name: item.name, park: item.park, category: item.category, price_label: item.price_label, price_mid: item.price_mid,
      lightning_lane_tier: item.lightning_lane_tier ?? null,
      dining_tier: item.dining_tier ?? null, cuisine: item.cuisine ?? null, dining_plan_credits: item.dining_plan_credits ?? null,
    })
    .select(WISH_SELECT)
    .single()

  return { data, error }
}

export async function addCustomWishFavorite(userId, familyMemberId, fields) {
  const { data, error } = await supabase
    .from('family_member_wish_favorites')
    .insert({ user_id: userId, family_member_id: familyMemberId, source: 'custom', catalog_id: null, ...fields })
    .select(WISH_SELECT)
    .single()

  return { data, error }
}

export async function removeWishFavorite(id) {
  const { error } = await supabase.from('family_member_wish_favorites').delete().eq('id', id)
  return { error }
}

export async function removeWishFavoriteByCatalogId(familyMemberId, catalogId) {
  const { error } = await supabase
    .from('family_member_wish_favorites')
    .delete()
    .eq('family_member_id', familyMemberId)
    .eq('catalog_id', catalogId)

  return { error }
}

export async function fetchPackFavorites(familyMemberId) {
  const { data, error } = await supabase
    .from('family_member_pack_favorites')
    .select(PACK_SELECT)
    .eq('family_member_id', familyMemberId)
    .order('created_at')

  return { data: data ?? [], error }
}

export async function addPackFavorite(userId, familyMemberId, label) {
  const { data, error } = await supabase
    .from('family_member_pack_favorites')
    .insert({ user_id: userId, family_member_id: familyMemberId, label })
    .select(PACK_SELECT)
    .single()

  return { data, error }
}

export async function removePackFavorite(id) {
  const { error } = await supabase.from('family_member_pack_favorites').delete().eq('id', id)
  return { error }
}

// Applies every included family member's saved favorites to a just-created
// (or just-duplicated) trip: catalog wish favorites are deduped into one
// wish list row per catalog item, tagged with everyone who favorited it;
// custom favorites and "always pack" items are inserted as-is. Safe to call
// on a trip that already has wish list rows (duplication) — an existing row
// for the same catalog item is updated in place instead of duplicated.
export async function applyFamilyFavorites(userId, tripId, familyMemberIds, familyMembers) {
  if (!familyMemberIds?.length) return { wishAdded: 0, packAdded: 0 }

  const nameById = new Map(familyMembers.map(m => [m.id, m.name.split(' ')[0]]))

  const [{ data: wishFavorites }, { data: packFavorites }, { data: existingWishItems }] = await Promise.all([
    supabase.from('family_member_wish_favorites').select(WISH_SELECT).in('family_member_id', familyMemberIds).then(r => ({ data: r.data ?? [] })),
    supabase.from('family_member_pack_favorites').select(PACK_SELECT).in('family_member_id', familyMemberIds).then(r => ({ data: r.data ?? [] })),
    fetchWishList(userId, tripId),
  ])

  let wishAdded = 0
  const catalogGroups = new Map()
  const customFavorites = []
  for (const f of wishFavorites) {
    if (f.source === 'catalog') {
      if (!catalogGroups.has(f.catalog_id)) catalogGroups.set(f.catalog_id, { item: f, names: [] })
      catalogGroups.get(f.catalog_id).names.push(nameById.get(f.family_member_id) || 'Family')
    } else {
      customFavorites.push(f)
    }
  }

  const wishInsertRows = []
  for (const { item, names } of catalogGroups.values()) {
    const favoritedBy = names.length > 1 ? names : null
    const existing = existingWishItems.find(w => w.catalog_id === item.catalog_id)
    if (existing) {
      await updateWishListItem(existing.id, { favorited_by: favoritedBy })
    } else {
      wishInsertRows.push({
        user_id: userId, trip_id: tripId, catalog_id: item.catalog_id, custom: false,
        name: item.name, park: item.park, category: item.category,
        price_label: item.price_label, price_mid: item.price_mid, favorited_by: favoritedBy,
        lightning_lane_tier: item.lightning_lane_tier,
        dining_tier: item.dining_tier, cuisine: item.cuisine, dining_plan_credits: item.dining_plan_credits,
      })
    }
    wishAdded++
  }
  for (const f of customFavorites) {
    wishInsertRows.push({
      user_id: userId, trip_id: tripId, catalog_id: null, custom: true,
      name: f.name, park: f.park, category: f.category, price_label: f.price_label, price_mid: f.price_mid, notes: f.notes,
    })
    wishAdded++
  }
  if (wishInsertRows.length) await supabase.from('wish_list_items').insert(wishInsertRows)

  const packRows = packFavorites.map((f, i) => ({
    user_id: userId, trip_id: tripId, family_member_id: f.family_member_id,
    category: 'personal', text: f.label, custom: true, sort_order: i,
  }))
  if (packRows.length) await insertPackingItems(packRows)

  return { wishAdded, packAdded: packRows.length }
}
