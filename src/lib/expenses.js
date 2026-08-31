import { supabase } from '../supabase'
import { normalizeCat } from './categories'

const SELECT = 'id, day, cat, label, time, status, ll_type, planned_amt, actual_amt, is_budget, payment_source, no_cost, booth_name, festival'

export async function fetchExpenses(tripId) {
  const { data, error } = await supabase
    .from('expenses')
    .select(SELECT)
    .eq('trip_id', tripId)

  return { data: (data ?? []).map(r => ({ ...r, cat: normalizeCat(r.cat) })), error }
}

export async function createExpense(userId, tripId, fields) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({ user_id: userId, trip_id: tripId, ...fields })
    .select(SELECT)
    .single()

  return { data, error }
}

export async function updateExpense(id, fields) {
  const { data, error } = await supabase
    .from('expenses')
    .update(fields)
    .eq('id', id)
    .select(SELECT)
    .single()

  return { data, error }
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  return { error }
}

// Category-level budget lives on the row flagged is_budget=true for that
// category. Updates it if present, or creates one (matches the "inline
// budget edit" data model note).
export async function setCategoryBudget(userId, tripId, cat, plannedAmt, existingRowId) {
  if (existingRowId) {
    return updateExpense(existingRowId, { planned_amt: plannedAmt })
  }
  return createExpense(userId, tripId, { day: null, cat, label: null, planned_amt: plannedAmt, is_budget: true })
}
