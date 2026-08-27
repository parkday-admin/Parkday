import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Plus Pass renews yearly on the signup anniversary — mirrors Account.jsx's
// nextRenewalDate (kept in UTC calendar terms so it doesn't shift a day
// depending on server timezone).
function nextRenewalDate(createdAt: string): Date {
  const signup = new Date(createdAt)
  const now = new Date()
  const month = signup.getUTCMonth()
  const day = signup.getUTCDate()
  let next = new Date(Date.UTC(now.getUTCFullYear(), month, day))
  if (next <= now) next = new Date(Date.UTC(now.getUTCFullYear() + 1, month, day))
  return next
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret)
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        if (!userId) break

        const planType = session.mode === 'payment' ? 'trip_pass' : 'plus_pass'

        await supabaseAdmin
          .from('profiles')
          // access_until: null clears any pending cancellation cutoff —
          // relevant if they'd cancelled and are now buying again before
          // that date arrived.
          .update({ subscription_status: 'active', plan_type: planType, access_until: null })
          .eq('id', userId)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // A successful renewal charge means they didn't cancel (or
        // un-cancelled before the period ended) — clear any pending cutoff
        // the same as a fresh purchase. No-op if it was already null.
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'active', access_until: null })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'inactive' })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'customer.subscription.deleted': {
        // Cancelling shouldn't cut access immediately, however soon this
        // event actually fires (that timing depends on the Stripe Customer
        // Portal's cancellation config, not this app) — they've already
        // paid through their current period, so access should continue
        // until it actually ends. Record that cutoff date instead of
        // deactivating now; expire_cancelled_plus_passes() (a daily
        // pg_cron job) is what applies it once the date arrives.
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, created_at')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabaseAdmin
            .from('profiles')
            .update({ access_until: nextRenewalDate(profile.created_at).toISOString() })
            .eq('id', profile.id)
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
