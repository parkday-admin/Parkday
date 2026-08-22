import { useState } from 'react'
import { createCheckoutSession } from '../lib/stripe'
import { signOut } from '../lib/auth'
import styles from './Paywall.module.css'

const PLANS = [
  {
    id: 'trip_pass',
    priceId: import.meta.env.VITE_STRIPE_TRIP_PASS_PRICE_ID,
    name: 'Trip Pass',
    price: '$29.99',
    period: 'one time',
    tagline: 'Plan a single trip',
    features: [
      'Full trip budget planner',
      'Park day scheduling',
      'Lightning Lane cost tracking',
    ],
    highlight: false,
  },
  {
    id: 'plus_pass',
    priceId: import.meta.env.VITE_STRIPE_PLUS_PASS_PRICE_ID,
    name: 'Plus Pass',
    price: '$59.99',
    period: '/ year',
    tagline: 'Unlimited trips',
    features: [
      'Everything in Trip Pass',
      'Unlimited trips for a year',
      'Trip duplication',
      'Priority support',
    ],
    highlight: true,
  },
]

export default function Paywall({ session }) {
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState(null)

  async function handleSelect(plan) {
    setError(null)
    setLoadingPlan(plan.id)

    const { data, error } = await createCheckoutSession(plan.priceId, session.user.id, session.user.email)

    if (error || !data?.url) {
      setError(error?.message ?? 'Something went wrong starting checkout.')
      setLoadingPlan(null)
      return
    }

    window.location.href = data.url
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>parkday</span>
        <button className={styles.signOut} onClick={signOut}>Sign out</button>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>Choose your plan</h1>
          <p className={styles.tagline}>Pick a pass to start planning your Disney World trip.</p>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.cards}>
          {PLANS.map(plan => (
            <div key={plan.id} className={`${styles.card} ${plan.highlight ? styles.highlight : ''}`}>
              {plan.highlight && <span className={styles.badge}>Best value</span>}
              <h2>{plan.name}</h2>
              <p className={styles.price}>
                {plan.price} <span className={styles.period}>{plan.period}</span>
              </p>
              <p className={styles.subtitle}>{plan.tagline}</p>
              <ul className={styles.features}>
                {plan.features.map(f => <li key={f}>{f}</li>)}
              </ul>
              <button
                className={styles.cta}
                onClick={() => handleSelect(plan)}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === plan.id ? 'Redirecting…' : 'Get started'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
