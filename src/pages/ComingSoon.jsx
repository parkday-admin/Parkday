import styles from './ComingSoon.module.css'

export default function ComingSoon({ title, icon }) {
  return (
    <div className={styles.wrap}>
      <i className={`ti ${icon} ${styles.icon}`} />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.sub}>This feature is coming soon.</p>
    </div>
  )
}
