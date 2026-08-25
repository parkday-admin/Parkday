import { supabase } from '../supabase'
import { normalizeCat } from './categories'

export async function fetchExpenses(tripId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, day, cat, label, time, status, ll_type, planned_amt, actual_amt')
    .eq('trip_id', tripId)

  return { data: (data ?? []).map(r => ({ ...r, cat: normalizeCat(r.cat) })), error }
}

export async function createExpense(userId, tripId, fields) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({ user_id: userId, trip_id: tripId, ...fields })
    .select('id, day, cat, label, time, status, ll_type, planned_amt, actual_amt')
    .single()

  return { data, error }
}

export async function updateExpense(id, fields) {
  const { data, error } = await supabase
    .from('expenses')
    .update(fields)
    .eq('id', id)
    .select('id, day, cat, label, time, status, ll_type, planned_amt, actual_amt')
    .single()

  return { data, error }
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  return { error }
}

// Category-level budget lives on the day=null, unlabeled row the
// configurator created for that category. Updates it if present, or
// creates one (matches the "inline budget edit" data model note).
export async function setCategoryBudget(userId, tripId, cat, plannedAmt, existingRowId) {
  if (existingRowId) {
    return updateExpense(existingRowId, { planned_amt: plannedAmt })
  }
  return createExpense(userId, tripId, { day: null, cat, label: null, planned_amt: plannedAmt })
}
