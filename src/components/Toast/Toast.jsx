import styles from './Toast.module.css'

export default function Toast({ toast }) {
  return (
    <div className={`${styles.toast} ${toast ? styles.show : ''}`}>
      <span>{toast?.message}</span>
      {toast?.actionLabel && (
        <button type="button" className={styles.action} onClick={toast.onAction}>{toast.actionLabel}</button>
      )}
    </div>
  )
}
