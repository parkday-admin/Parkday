import { signOutAndRedirect } from '../lib/auth'
import styles from './Paywall.module.css'

// Shown in place of the paywall when a collaborator's owner has an
// inactive subscription — collaborators never see the paywall itself
// (they don't have a plan of their own to buy).
export default function PausedAccess({ ownerName }) {
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
          <h1 className={styles.headline}>Access paused</h1>
          <p className={styles.subhead}>
            Your access is currently paused. {ownerName}'s Parkday subscription is inactive.
            Once they renew, you'll be able to access the trips again.
          </p>
        </div>
      </main>
    </div>
  )
}
