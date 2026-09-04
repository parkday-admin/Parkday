import styles from './ProgressBar.module.css'

const TONE_VAR = { gold: 'var(--gold)', teal: 'var(--teal)', sky: 'var(--sky)', coral: 'var(--coral)' }

// Matches the design system's ProgressBar contract: a track + fill, tone
// picks the fill color, dark switches the track for use on a navy surface.
export default function ProgressBar({ value = 0, tone = 'gold', dark = false, height = 4 }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      className={styles.track}
      style={{ height, borderRadius: height / 2, background: dark ? 'var(--border-on-dark)' : 'var(--border-light)' }}
    >
      <div
        className={styles.fill}
        style={{ width: `${pct}%`, borderRadius: height / 2, background: TONE_VAR[tone] || TONE_VAR.gold }}
      />
    </div>
  )
}
