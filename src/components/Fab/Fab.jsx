import styles from './Fab.module.css'

export default function Fab({ onClick, title = 'Add expense' }) {
  return (
    <button type="button" className={styles.fab} onClick={onClick} title={title} aria-label={title}>
      <i aria-hidden="true" className="ti ti-plus" />
    </button>
  )
}
