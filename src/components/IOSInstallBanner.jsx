import { useState } from 'react'
import styles from './IOSInstallBanner.module.css'

const DISMISS_KEY = 'pwa-ios-banner-dismissed'

function isIOSSafari() {
  const ua = window.navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isOtherIOSBrowser = /CriOS|FxiOS/.test(ua)
  return isIOS && !isOtherIOSBrowser
}

function isStandalone() {
  return window.navigator.standalone === true
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === 'true'
  } catch {
    return false
  }
}

function ShareIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 3v12" stroke="#F5B536" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7l4-4 4 4" stroke="#F5B536" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="10" width="14" height="11" rx="2" stroke="#F5B536" strokeWidth="1.8" />
    </svg>
  )
}

export default function IOSInstallBanner() {
  const [dismissed, setDismissed] = useState(readDismissed)

  if (dismissed || !isIOSSafari() || isStandalone()) return null

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, 'true')
    } catch {
      // ignore storage failures — banner still hides for this session
    }
    setDismissed(true)
  }

  return (
    <div className={styles.banner}>
      <div className={styles.icon}>
        <ShareIcon />
      </div>
      <div className={styles.text}>
        <p className={styles.title}>Add Parkday to your home screen</p>
        <p className={styles.body}>Tap the share icon then "Add to Home Screen" for the best experience.</p>
      </div>
      <button type="button" className={styles.dismiss} onClick={handleDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
