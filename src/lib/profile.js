import { supabase } from '../supabase'

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_status, plan_type')
    .eq('id', userId)
    .single()

  return { data, error }
}
