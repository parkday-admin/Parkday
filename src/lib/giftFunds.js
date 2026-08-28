import { supabase } from '../supabase'

export const REWARD_TYPE_ICON = { visa: 'ti-credit-card', insiders: 'ti-movie', travel: 'ti-plane', other: 'ti-star' }
export const REWARD_TYPE_LABEL = { visa: 'Disney Visa reward dollars', insiders: 'Disney Movie Insiders points', travel: 'Travel credit / miles', other: 'Other' }
export const REWARD_TYPE_PROGRAM_DEFAULT = { visa: 'Disney Visa', insiders: 'Disney Movie Insiders', travel: 'Travel credit', other: '' }

const GC_SELECT = 'id, source, original_amount, balance, last4, date_added, depleted'
const RW_SELECT = 'id, type, program, detail, value, original_value'

export async function fetchGiftCards(userId, tripId) {
  const { data, error } = await supabase
    .from('gift_cards')
    .select(GC_SELECT)
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .order('created_at')

  return { data: data ?? [], error }
}

export async function createGiftCard(userId, tripId, fields) {
  const { data, error } = await supabase
    .from('gift_cards')
    .insert({ user_id: userId, trip_id: tripId, ...fields })
    .select(GC_SELECT)
    .single()

  return { data, error }
}

export async function updateGiftCard(id, fields) {
  const { data, error } = await supabase
    .from('gift_cards')
    .update(fields)
    .eq('id', id)
    .select(GC_SELECT)
    .single()

  return { data, error }
}

export async function deleteGiftCard(id) {
  const { error } = await supabase.from('gift_cards').delete().eq('id', id)
  return { error }
}

export async function fetchRewardPrograms(userId, tripId) {
  const { data, error } = await supabase
    .from('reward_programs')
    .select(RW_SELECT)
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .order('created_at')

  return { data: data ?? [], error }
}

export async function createRewardProgram(userId, tripId, fields) {
  const { data, error } = await supabase
    .from('reward_programs')
    .insert({ user_id: userId, trip_id: tripId, ...fields })
    .select(RW_SELECT)
    .single()

  return { data, error }
}

export async function updateRewardProgram(id, fields) {
  const { data, error } = await supabase
    .from('reward_programs')
    .update(fields)
    .eq('id', id)
    .select(RW_SELECT)
    .single()

  return { data, error }
}

export async function deleteRewardProgram(id) {
  const { error } = await supabase.from('reward_programs').delete().eq('id', id)
  return { error }
}

export function giftFundsTotals(giftCards, rewardPrograms) {
  const totalValue = giftCards.reduce((s, c) => s + (c.original_amount || 0), 0)
  const remaining = giftCards.reduce((s, c) => s + (c.balance || 0), 0)
  const spent = totalValue - remaining
  const rewardsValue = rewardPrograms.reduce((s, r) => s + (r.value || 0), 0)
  return { totalValue, spent, remaining, rewardsValue, totalAvailable: remaining + rewardsValue }
}

// Usage counts/lists for a card or reward, derived from an already-fetched
// trip expenses array (payment_source is a plain text ref, not a join).
export function usesFor(expenses, kind, id) {
  const ref = `${kind}:${id}`
  return expenses.filter(e => e.payment_source === ref)
}

// Grouped <select> options for the expense sheet's payment source field.
// Value encodes the source: "gift:<uuid>", "reward:<uuid>", or "manual:<label>".
export function paymentSourceGroups(giftCards, rewardPrograms) {
  return {
    other: ['Cash', 'Credit card', 'Debit card', 'Check', 'PayPal'].map(label => ({ value: `manual:${label}`, label })),
    gift: giftCards.filter(c => c.balance > 0).map(c => ({
      value: `gift:${c.id}`,
      label: `${c.source}${c.last4 ? ` •••• ${c.last4}` : ''} — $${Math.round(c.balance)} left`,
    })),
    reward: rewardPrograms.filter(r => r.value > 0).map(r => ({
      value: `reward:${r.id}`,
      label: `${r.program} — $${Math.round(r.value)} left`,
    })),
  }
}
