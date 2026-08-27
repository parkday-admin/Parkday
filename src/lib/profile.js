import { supabase } from '../supabase'

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_status, plan_type, account_type, collaborator_of')
    .eq('id', userId)
    .single()

  return { data, error }
}

export async function getFullProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, timezone, stripe_customer_id, subscription_status, plan_type, notif_deadlines, notif_checkin, notif_budget, notif_marketing, created_at, account_type, collaborator_of')
    .eq('id', userId)
    .single()

  return { data, error }
}

export async function updateProfile(userId, fields) {
  const { data, error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId)
    .select('full_name, timezone, stripe_customer_id, subscription_status, plan_type, notif_deadlines, notif_checkin, notif_budget, notif_marketing')
    .single()

  return { data, error }
}

export async function deleteAccount() {
  const { data, error } = await supabase.functions.invoke('delete-account')

  if (error) {
    // supabase-js's error.message is a generic "non-2xx status code" string;
    // the function's actual {error} body is only available on error.context.
    const body = await error.context?.json?.().catch(() => null)
    return { data, error: { message: body?.error ?? error.message } }
  }

  return { data, error }
}
