import { useState } from 'react'
import { WL_CAT_ORDER, WL_PARK_LABEL, wlCatMeta, priceBucket } from '../../lib/wishlist'
import styles from './BrowseCatalogSheet.module.css'

const CAT_OPTIONS = [{ value: 'all', label: 'All categories' }, ...WL_CAT_ORDER.map(k => ({ value: k, label: wlCatMeta(k).label }))]
const PARK_OPTIONS = [
  { value: 'all', label: 'All parks' },
  { value: 'MK', label: 'Magic Kingdom' },
  { value: 'EPCOT', label: 'EPCOT' },
  { value: 'HS', label: 'Hollywood Studios' },
  { value: 'AK', label: 'Animal Kingdom' },
  { value: 'Resort', label: 'Resort' },
]
const PRICE_OPTIONS = [
  { value: 'all', label: 'Any price' },
  { value: 'free', label: 'Free' },
  { value: 'under50', label: 'Under $50' },
  { value: '50to150', label: '$50–$150' },
  { value: 'over150', label: '$150+' },
]

export default function BrowseCatalogSheet({ open, catalog, savedCatalogIds, onClose, onToggleSave }) {
  const [catFilter, setCatFilter] = useState('all')
  const [parkFilter, setParkFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')

  if (!open) return null

  const filtered = catalog.filter(c => {
    if (catFilter !== 'all' && c.category !== catFilter) return false
    if (parkFilter !== 'all' && c.park !== parkFilter && c.park !== 'All parks') return false
    if (priceFilter !== 'all' && priceBucket(c.price_mid) !== priceFilter) return false
    return true
  })

  return (
    <div className={styles.browseSheet}>
      <div className={styles.hdr}>
        <button type="button" className={styles.backBtn} onClick={onClose} title="Back to wish list">
          <i className="ti ti-arrow-left" />
        </button>
        <div className={styles.title}>Browse catalog</div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.filterBar}>
          <select className={styles.filterSelect} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className={styles.filterSelect} value={parkFilter} onChange={e => setParkFilter(e.target.value)}>
            {PARK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className={styles.filterSelect} value={priceFilter} onChange={e => setPriceFilter(e.target.value)}>
            {PRICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyPrompt}>
            <i className="ti ti-mood-empty" />
            <div className={styles.emptyTitle}>No matches</div>
            <div className={styles.emptySub}>Try adjusting your filters.</div>
          </div>
        ) : (
          filtered.map(c => {
            const meta = wlCatMeta(c.category)
            const saved = savedCatalogIds.has(c.id)
            return (
              <div key={c.id} className={styles.catCard}>
                <div className={styles.catCardTop}>
                  <div className={styles.itemIcon} style={{ background: meta.bg }}><i className={`ti ${meta.icon}`} style={{ color: meta.color }} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.catCardName}>{c.name}</div>
                    <div className={styles.catCardPark}>
                      {c.park === 'All parks' ? 'All parks' : (WL_PARK_LABEL[c.park] || c.park)} · <span className={styles.pill} style={{ background: meta.bg, color: meta.color }}>{meta.label.replace(/s$/, '')}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`${styles.heartBtn} ${saved ? styles.saved : ''}`}
                    onClick={() => onToggleSave(c)}
                    title={saved ? 'Remove from wish list' : 'Save to wish list'}
                  >
                    <i className={`ti ${saved ? 'ti-heart-filled' : 'ti-heart'}`} />
                  </button>
                </div>
                <div className={styles.catCardDesc}>{c.description}</div>
                {c.price_label && <div className={styles.catCardBottom}><div className={styles.catCardPrice}>{c.price_label}</div></div>}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
