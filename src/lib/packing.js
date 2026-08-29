import { supabase } from '../supabase'
import { familyMemberAge } from './familyMembers'

export const PACK_CAT_META = {
  documents: { label: 'Documents', icon: 'ti-file-text' },
  parkbag: { label: 'Park Bag', icon: 'ti-backpack' },
  clothing: { label: 'Clothing', icon: 'ti-shirt' },
  medical: { label: 'Medical', icon: 'ti-first-aid-kit' },
  resort: { label: 'Resort Room', icon: 'ti-bed' },
  personal: { label: 'Personal items', icon: 'ti-star' },
}
export const PACK_CAT_ORDER = ['documents', 'parkbag', 'clothing', 'medical', 'resort', 'personal']

const SELECT = 'id, family_member_id, category, text, checked, custom, sort_order'

export async function fetchPackingItems(userId, tripId) {
  const { data, error } = await supabase
    .from('packing_items')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .order('sort_order')

  return { data: data ?? [], error }
}

export async function insertPackingItems(rows) {
  if (!rows.length) return { data: [], error: null }
  const { data, error } = await supabase.from('packing_items').insert(rows).select(SELECT)
  return { data: data ?? [], error }
}

export async function togglePackingItem(id, checked) {
  const { error } = await supabase.from('packing_items').update({ checked }).eq('id', id)
  return { error }
}

export async function deletePackingItem(id) {
  const { error } = await supabase.from('packing_items').delete().eq('id', id)
  return { error }
}

export async function addCustomPackingItem(userId, tripId, familyMemberId, category, text, sortOrder) {
  const { data, error } = await supabase
    .from('packing_items')
    .insert({ user_id: userId, trip_id: tripId, family_member_id: familyMemberId, category, text, custom: true, sort_order: sortOrder })
    .select(SELECT)
    .single()

  return { data, error }
}

export async function deletePackingItemsForTab(tripId, familyMemberId, onlyDefaults) {
  let query = supabase.from('packing_items').delete().eq('trip_id', tripId)
  query = familyMemberId ? query.eq('family_member_id', familyMemberId) : query.is('family_member_id', null)
  if (onlyDefaults) query = query.eq('custom', false)
  const { error } = await query
  return { error }
}

function isChild(member) {
  const age = familyMemberAge(member.birthdate)
  return age != null && age < 10
}
function isToddler(member) {
  const age = familyMemberAge(member.birthdate)
  return age != null && age < 3
}

// Per-family-member checklist, keyed by category.
export function buildPersonItems(member, tripCtx) {
  const { isFlying, isSummer, parkDayCount } = tripCtx
  const child = isChild(member)
  const toddler = isToddler(member)

  const documents = [child ? 'Copy of birth certificate (optional, for ID)' : 'Government-issued photo ID']
  if (isFlying) documents.push('Mobile boarding pass loaded')
  documents.push('Park ticket / MagicMobile pass loaded')
  if (member.annual_pass) documents.push('Annual Pass card')

  const parkbag = ['Reusable water bottle']
  if (isSummer) parkbag.push('Travel-size sunscreen (for touch-ups)', 'Poncho')
  parkbag.push('Portable phone charger', 'Snacks for the parks')
  if (child) parkbag.push('Autograph book & pen', 'Character ears / headband', 'Small comfort item (stuffed animal)')

  const clothing = [`Park-day outfits (${parkDayCount}–${parkDayCount + 1}, moisture-wicking)`, 'Comfortable broken-in shoes']
  if (isSummer) clothing.push('Light rain jacket', 'Hat or cap', 'Sunglasses')
  clothing.push('Swimsuit + cover-up', 'Pajamas')
  if (child) clothing.push('Extra change of clothes (accidents happen)')
  if (toddler) clothing.push('Diapers & wipes')

  const medical = ['Prescription medications']
  if (isFlying) medical.push('Motion sickness tablets (for the flight)')
  medical.push('Pain/fever reliever', 'Band-aids & blister care')
  if (isSummer) medical.push('After-sun / aloe vera gel')
  if (child) medical.push("Children's sunscreen SPF 50")

  const resort = ['Phone & watch chargers', 'Toiletries bag']
  if (child) resort.push('Nightlight', 'Sound machine (or app)')

  return { documents, parkbag, clothing, medical, resort }
}

// Shared "Group" tab checklist — no per-person clothing/medical items.
export function buildGroupItems(familyMembers, tripCtx) {
  const { isFlying, isSummer, parkDayCount } = tripCtx
  const hasYoungKid = familyMembers.some(m => {
    const age = familyMemberAge(m.birthdate)
    return age != null && age < 6
  })

  const documents = ['Printed/mobile copies of resort & ticket confirmations', 'Travel insurance info']
  if (isFlying) documents.unshift('TSA-compliant liquids bag')

  const parkbag = []
  if (isSummer) {
    const bottles = Math.ceil(parkDayCount / 2)
    parkbag.push(`Reef-safe sunscreen (${bottles}–${bottles + 1} family-size bottles)`, 'Cooling towels (2–3)', 'Rain ponchos (spares)', 'Portable misting fan')
  }
  parkbag.push('Comprehensive first aid kit', 'Ziploc bags, assorted sizes')
  if (hasYoungKid) parkbag.push('Stroller')

  const resort = ['Laundry pods', 'Door magnet / room decorations', 'Snack stash for the room', 'Portable charger (shared backup)']

  return { documents, parkbag, clothing: [], medical: [], resort }
}

function itemsToRows(userId, tripId, familyMemberId, itemsByCategory) {
  const rows = []
  PACK_CAT_ORDER.forEach(catKey => {
    ;(itemsByCategory[catKey] || []).forEach((text, i) => {
      rows.push({ user_id: userId, trip_id: tripId, family_member_id: familyMemberId, category: catKey, text, sort_order: i })
    })
  })
  return rows
}

export function buildTabRows(userId, tripId, familyMemberId, member, familyMembers, tripCtx) {
  const items = member ? buildPersonItems(member, tripCtx) : buildGroupItems(familyMembers, tripCtx)
  return itemsToRows(userId, tripId, familyMemberId, items)
}

// Generates every tab's default rows (one per family member + the group
// tab) for a trip's first visit to the packing list.
export function buildAllRows(userId, tripId, familyMembers, tripCtx) {
  const rows = familyMembers.flatMap(m => buildTabRows(userId, tripId, m.id, m, familyMembers, tripCtx))
  rows.push(...buildTabRows(userId, tripId, null, null, familyMembers, tripCtx))
  return rows
}
