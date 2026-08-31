import { useState } from 'react'
import CatalogGrid from '../CatalogGrid/CatalogGrid'
import styles from './BrowseCatalogSheet.module.css'

export default function BrowseCatalogSheet({ open, catalog, savedCatalogIds, onClose, onToggleSave }) {
  const [search, setSearch] = useState('')

  if (!open) return null

  return (
    <div className={styles.browseSheet}>
      <div className={styles.hdr}>
        <button type="button" className={styles.backBtn} onClick={onClose} title="Back to wish list">
          <i className="ti ti-arrow-left" />
        </button>
        <div className={styles.searchWrap}>
          <i className="ti ti-search" />
          <input
            className={styles.searchInp}
            type="text"
            placeholder="Search catalog"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.scroll}>
        <CatalogGrid catalog={catalog} savedIds={savedCatalogIds} onToggleSave={onToggleSave} search={search} onSearchChange={setSearch} hideSearchBar />
      </div>
    </div>
  )
}
