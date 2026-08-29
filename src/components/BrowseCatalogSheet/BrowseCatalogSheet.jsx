import CatalogGrid from '../CatalogGrid/CatalogGrid'
import styles from './BrowseCatalogSheet.module.css'

export default function BrowseCatalogSheet({ open, catalog, savedCatalogIds, onClose, onToggleSave }) {
  if (!open) return null

  return (
    <div className={styles.browseSheet}>
      <div className={styles.hdr}>
        <button type="button" className={styles.backBtn} onClick={onClose} title="Back to wish list">
          <i className="ti ti-arrow-left" />
        </button>
        <div className={styles.title}>Browse catalog</div>
      </div>

      <div className={styles.scroll}>
        <CatalogGrid catalog={catalog} savedIds={savedCatalogIds} onToggleSave={onToggleSave} />
      </div>
    </div>
  )
}
