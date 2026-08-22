import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const tripPassPriceId = Deno.env.get('STRIPE_TRIP_PASS_PRICE_ID')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { priceId, userId, email } = await req.json()

    if (!priceId || !userId || !email) {
      return new Response(JSON.stringify({ error: 'priceId, userId, and email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profileError) throw profileError

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const existing = await stripe.customers.list({ email, limit: 1 })
      const customer = existing.data[0] ?? (await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      }))
      customerId = customer.id

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)

      if (updateError) throw updateError
    }

    const mode = priceId === tripPassPriceId ? 'payment' : 'subscription'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://parkday-nu.vercel.app/dashboard',
      cancel_url: 'https://parkday-nu.vercel.app/paywall',
      metadata: { supabase_user_id: userId },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
