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

// Per-family-member checklist, keyed by category. Conditional items also
// record why they were suggested, in `reasons` (keyed by item text), so the
// UI can show the user the trip detail that triggered the suggestion instead
// of presenting every item as an unexplained fixed requirement.
export function buildPersonItems(member, tripCtx) {
  const { isFlying, isSummer, parkDayCount } = tripCtx
  const child = isChild(member)
  const toddler = isToddler(member)
  const reasons = new Map()
  const note = (text, reason) => { reasons.set(text, reason); return text }

  const documents = [child ? 'Copy of birth certificate (optional, for ID)' : 'Government-issued photo ID']
  if (isFlying) documents.push(note('Mobile boarding pass loaded', "Because you're flying"))
  documents.push('Park ticket / MagicMobile pass loaded')
  if (member.annual_pass) documents.push(note('Annual Pass card', 'Because you hold an Annual Pass'))

  const parkbag = ['Reusable water bottle']
  if (isSummer) parkbag.push(note('Travel-size sunscreen (for touch-ups)', 'Because your trip is in summer'), note('Poncho', 'Because your trip is in summer'))
  parkbag.push('Portable phone charger', 'Snacks for the parks')
  if (child) parkbag.push(note('Autograph book & pen', 'Since a child is packing'), note('Character ears / headband', 'Since a child is packing'), note('Small comfort item (stuffed animal)', 'Since a child is packing'))

  const clothing = [`Park-day outfits (${parkDayCount}–${parkDayCount + 1}, moisture-wicking)`, 'Comfortable broken-in shoes']
  if (isSummer) clothing.push(note('Light rain jacket', 'Because your trip is in summer'), note('Hat or cap', 'Because your trip is in summer'), note('Sunglasses', 'Because your trip is in summer'))
  clothing.push('Swimsuit + cover-up', 'Pajamas')
  if (child) clothing.push(note('Extra change of clothes (accidents happen)', 'Since a child is packing'))
  if (toddler) clothing.push(note('Diapers & wipes', 'Since a toddler is packing'))

  const medical = ['Prescription medications']
  if (isFlying) medical.push(note('Motion sickness tablets (for the flight)', "Because you're flying"))
  medical.push('Pain/fever reliever', 'Band-aids & blister care')
  if (isSummer) medical.push(note('After-sun / aloe vera gel', 'Because your trip is in summer'))
  if (child) medical.push(note("Children's sunscreen SPF 50", 'Since a child is packing'))

  const resort = ['Phone & watch chargers', 'Toiletries bag']
  if (child) resort.push(note('Nightlight', 'Since a child is packing'), note('Sound machine (or app)', 'Since a child is packing'))

  return { documents, parkbag, clothing, medical, resort, reasons }
}

// Shared "Group" tab checklist — no per-person clothing/medical items.
export function buildGroupItems(familyMembers, tripCtx) {
  const { isFlying, isSummer, parkDayCount } = tripCtx
  const hasYoungKid = familyMembers.some(m => {
    const age = familyMemberAge(m.birthdate)
    return age != null && age < 6
  })
  const reasons = new Map()
  const note = (text, reason) => { reasons.set(text, reason); return text }

  const documents = ['Printed/mobile copies of resort & ticket confirmations', 'Travel insurance info']
  if (isFlying) documents.unshift(note('TSA-compliant liquids bag', "Because you're flying"))

  const parkbag = []
  if (isSummer) {
    const bottles = Math.ceil(parkDayCount / 2)
    parkbag.push(
      note(`Reef-safe sunscreen (${bottles}–${bottles + 1} family-size bottles)`, 'Because your trip is in summer'),
      note('Cooling towels (2–3)', 'Because your trip is in summer'),
      note('Rain ponchos (spares)', 'Because your trip is in summer'),
      note('Portable misting fan', 'Because your trip is in summer'),
    )
  }
  parkbag.push('Comprehensive first aid kit', 'Ziploc bags, assorted sizes')
  if (hasYoungKid) parkbag.push(note('Stroller', 'Since young kids are on this trip'))

  const resort = ['Laundry pods', 'Door magnet / room decorations', 'Snack stash for the room', 'Portable charger (shared backup)']

  return { documents, parkbag, clothing: [], medical: [], resort, reasons }
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

// Text -> reason lookup for the active tab's auto-generated items, so the UI
// can tell the user why a default item was suggested. Custom (user-added)
// items simply won't be present in this map. Recomputed rather than stored
// alongside the row, since the generated text is deterministic from trip
// context and this avoids a schema change.
export function buildTabReasons(member, familyMembers, tripCtx) {
  const items = member ? buildPersonItems(member, tripCtx) : buildGroupItems(familyMembers, tripCtx)
  return items.reasons
}

// Generates every tab's default rows (one per family member + the group
// tab) for a trip's first visit to the packing list.
export function buildAllRows(userId, tripId, familyMembers, tripCtx) {
  const rows = familyMembers.flatMap(m => buildTabRows(userId, tripId, m.id, m, familyMembers, tripCtx))
  rows.push(...buildTabRows(userId, tripId, null, null, familyMembers, tripCtx))
  return rows
}
