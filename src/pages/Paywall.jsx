import { useState } from 'react'
import { createCheckoutSession } from '../lib/stripe'
import { signOutAndRedirect } from '../lib/auth'
import styles from './Paywall.module.css'

const PLANS = [
  {
    id: 'trip_pass',
    priceId: import.meta.env.VITE_STRIPE_TRIP_PASS_PRICE_ID,
    name: 'Trip Pass',
    price: '$29.99',
    period: 'one-time',
    tagline: 'Perfect for your first Disney trip.',
    features: [
      '1 trip',
      'Full planner access',
      'Budget tracker',
      'Wish List',
    ],
    cta: 'Get Trip Pass',
    highlight: false,
  },
  {
    id: 'plus_pass',
    priceId: import.meta.env.VITE_STRIPE_PLUS_PASS_PRICE_ID,
    name: 'Plus Pass',
    price: '$59.99',
    period: '/year',
    tagline: 'Best value if you Disney more than once.',
    features: [
      'Unlimited trips',
      'Everything in Trip Pass',
      'Early access to new features',
    ],
    cta: 'Get Plus Pass',
    highlight: true,
  },
]

const LAPSED_MESSAGE = {
  trip_pass: 'Your Trip Pass has expired 30 days after your trip. Purchase a plan to reactivate your account, create a new trip, or access your archived trip.',
  plus_pass: 'Your Plus Pass subscription has ended. Purchase a plan to reactivate your account and get back to planning.',
}

export default function Paywall({ session, currentPlanType = null, lapsedPlanType = null }) {
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState(null)

  const isUpgrading = currentPlanType === 'trip_pass'
  const lapsedMessage = lapsedPlanType ? LAPSED_MESSAGE[lapsedPlanType] : null
  // A Trip Pass holder landing here (the app's "Upgrade" buttons) is here
  // to move to Plus, not to buy a second one-time Trip Pass for the same
  // trip — showing that option back to them would just be confusing.
  const plans = isUpgrading ? PLANS.filter(plan => plan.id !== 'trip_pass') : PLANS

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
        <div className={styles.headerInner}>
          <span className={styles.brand}>
            <img className={styles.logoImg} src="/assets/logos/parkday-icon.svg" alt="Parkday" />
            <span className={styles.wordmark}>Parkday</span>
          </span>
          <button className={styles.signOut} onClick={signOutAndRedirect}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <h1 className={styles.headline}>{isUpgrading ? 'Upgrade to Plus' : 'Choose your plan'}</h1>
          <p className={styles.subhead}>
            {isUpgrading
              ? 'Unlock unlimited trips and keep planning beyond your first one.'
              : 'One-time purchase. No subscription required unless you want one.'}
          </p>
        </div>

        {lapsedMessage && (
          <p className={styles.notice}><i className="ti ti-alert-circle" />{lapsedMessage}</p>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.cards}>
          {plans.map(plan => (
            <div key={plan.id} className={`${styles.card} ${plan.highlight ? styles.highlight : ''}`}>
              {plan.highlight && <span className={styles.badge}>Recommended</span>}
              <h2 className={styles.planName}>{plan.name}</h2>
              <p className={styles.price}>
                {plan.price} <span className={styles.period}>{plan.period}</span>
              </p>
              <p className={styles.subtitle}>{plan.tagline}</p>
              <ul className={styles.features}>
                {plan.features.map(f => <li key={f}><i className="ti ti-check" />{f}</li>)}
              </ul>
              <button
                className={`${styles.cta} ${plan.highlight ? styles.ctaPrimary : styles.ctaSecondary}`}
                onClick={() => handleSelect(plan)}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === plan.id ? 'Redirecting…' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className={styles.nudge}>
          {isUpgrading
            ? 'Plus is just $59.99/yr — plan two trips and it pays for itself.'
            : 'Trip Pass is $29.99. Plus is just $59.99/yr — plan two trips and it pays for itself.'}
        </p>
      </main>
    </div>
  )
}
