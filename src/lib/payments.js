import { supabase } from '../supabase'

const SELECT = 'id, amount, date, method, payment_source, note'

export async function fetchPayments(userId, tripId) {
  const { data, error } = await supabase
    .from('payments')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .order('date', { ascending: false })

  return { data: data ?? [], error }
}

export async function createPayment(userId, tripId, fields) {
  const { data, error } = await supabase
    .from('payments')
    .insert({ user_id: userId, trip_id: tripId, ...fields })
    .select(SELECT)
    .single()

  return { data, error }
}

export async function updatePayment(id, fields) {
  const { data, error } = await supabase
    .from('payments')
    .update(fields)
    .eq('id', id)
    .select(SELECT)
    .single()

  return { data, error }
}

export async function deletePayment(id) {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  return { error }
}

export function paymentsPaidTotal(payments) {
  return payments.reduce((s, p) => s + (p.amount || 0), 0)
}

export function paymentUrgencyLevel(daysOut) {
  if (daysOut <= 7) return 'high'
  if (daysOut <= 30) return 'med'
  return 'low'
}

export const URGENCY_LABEL = { high: 'Urgent', med: 'Upcoming', low: 'On track' }

// The balance still available on a gift card/reward for a payment, given the
// amount an edit's previous save on the *same* source would free back up.
export function availablePaymentBalance(paymentSource, giftCards, rewardPrograms, prevSource, prevAmount) {
  if (!paymentSource) return Infinity
  let current = 0
  if (paymentSource.startsWith('gift:')) {
    const c = giftCards.find(g => `gift:${g.id}` === paymentSource)
    current = c?.balance || 0
  } else if (paymentSource.startsWith('reward:')) {
    const r = rewardPrograms.find(rw => `reward:${rw.id}` === paymentSource)
    current = r?.value || 0
  } else {
    return Infinity
  }
  return prevSource === paymentSource ? current + (prevAmount || 0) : current
}

export function paymentSourceLabel(paymentSource, giftCards, rewardPrograms) {
  if (!paymentSource) return ''
  if (paymentSource.startsWith('gift:')) {
    const c = giftCards.find(g => `gift:${g.id}` === paymentSource)
    return c?.source || 'Gift card'
  }
  if (paymentSource.startsWith('reward:')) {
    const r = rewardPrograms.find(rw => `reward:${rw.id}` === paymentSource)
    return r?.program || 'Reward'
  }
  return paymentSource
}
