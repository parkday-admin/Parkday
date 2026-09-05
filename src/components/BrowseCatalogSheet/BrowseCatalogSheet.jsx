import CatalogGrid from '../CatalogGrid/CatalogGrid'
import styles from './BrowseCatalogSheet.module.css'

// Search/filter state is owned by the caller (Wishlist.jsx) rather than
// this component, so a user's filters survive closing and reopening the
// sheet instead of resetting every time this component unmounts.
export default function BrowseCatalogSheet({
  open, catalog, savedCatalogIds, onClose, onToggleSave,
  search, onSearchChange, catFilter, onCatFilterChange, parkFilter, onParkFilterChange, priceFilter, onPriceFilterChange,
}) {
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
            onChange={e => onSearchChange(e.target.value)}
          />
          {search && (
            <button type="button" className={styles.searchClear} onClick={() => onSearchChange('')} aria-label="Clear search">
              <i className="ti ti-x" />
            </button>
          )}
        </div>
      </div>

      <div className={styles.scroll}>
        <CatalogGrid
          catalog={catalog}
          savedIds={savedCatalogIds}
          onToggleSave={onToggleSave}
          search={search}
          onSearchChange={onSearchChange}
          hideSearchBar
          catFilter={catFilter}
          onCatFilterChange={onCatFilterChange}
          parkFilter={parkFilter}
          onParkFilterChange={onParkFilterChange}
          priceFilter={priceFilter}
          onPriceFilterChange={onPriceFilterChange}
        />
      </div>
    </div>
  )
}
