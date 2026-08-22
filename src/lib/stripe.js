import { supabase } from '../supabase'

export async function createCheckoutSession(priceId, userId, email) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { priceId, userId, email },
  })

  return { data, error }
}
