import { supabase } from '../supabase'

export async function createCheckoutSession(priceId, userId, email) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { priceId, userId, email },
  })

  if (error) {
    // supabase-js's error.message is a generic "non-2xx status code" string;
    // the function's actual {error} body is only available on error.context.
    const body = await error.context?.json?.().catch(() => null)
    return { data, error: { message: body?.error ?? error.message } }
  }

  return { data, error }
}

export async function createPortalSession(customerId) {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: { customerId },
  })

  if (error) {
    const body = await error.context?.json?.().catch(() => null)
    return { data, error: { message: body?.error ?? error.message } }
  }

  return { data, error }
}
