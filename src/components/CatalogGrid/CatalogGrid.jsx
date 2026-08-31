import { useState } from 'react'
import { WL_CAT_ORDER, WL_CAT_PILL_LABEL, WL_PARK_LABEL, WL_PARK_GROUPS, LL_TIER_LABEL, DINING_TIER_LABEL, wlCatMeta, priceBucket } from '../../lib/wishlist'
import styles from './CatalogGrid.module.css'

const CAT_OPTIONS = [{ value: 'all', label: 'All categories' }, ...WL_CAT_ORDER.map(k => ({ value: k, label: wlCatMeta(k).label }))]
const PRICE_OPTIONS = [
  { value: 'all', label: 'Any price' },
  { value: 'free', label: 'Free' },
  { value: 'under50', label: 'Under $50' },
  { value: '50to150', label: '$50–$150' },
  { value: 'over150', label: '$150+' },
]

// Filterable catalog card grid with a heart toggle — the shared body of the
// full-screen wish list catalog browser (BrowseCatalogSheet) and the
// compact inline version used for family member favorites.
export default function CatalogGrid({ catalog, savedIds, onToggleSave, compact = false }) {
  const [catFilter, setCatFilter] = useState('all')
  const [parkFilter, setParkFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')

  const filtered = catalog.filter(c => {
    if (catFilter !== 'all' && c.category !== catFilter) return false
    if (parkFilter !== 'all' && c.park !== parkFilter && c.park !== 'All parks') return false
    if (priceFilter !== 'all' && priceBucket(c.price_mid) !== priceFilter) return false
    return true
  })

  return (
    <div className={compact ? styles.compact : undefined}>
      <div className={styles.filterBar}>
        <select className={styles.filterSelect} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={styles.filterSelect} value={parkFilter} onChange={e => setParkFilter(e.target.value)}>
          <option value="all">All parks</option>
          {WL_PARK_GROUPS.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map(code => <option key={code} value={code}>{WL_PARK_LABEL[code]}</option>)}
            </optgroup>
          ))}
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
          const saved = savedIds.has(c.id)
          return (
            <div key={c.id} className={styles.catCard}>
              <div className={styles.catCardTop}>
                <div className={styles.itemIcon} style={{ background: meta.bg }}><i className={`ti ${meta.icon}`} style={{ color: meta.color }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.catCardName}>{c.name}</div>
                  <div className={styles.catCardPark}>
                    {c.park === 'All parks' ? 'All parks' : (WL_PARK_LABEL[c.park] || c.park)} · <span className={styles.pill} style={{ background: meta.bg, color: meta.color }}>{WL_CAT_PILL_LABEL[c.category] || meta.label}</span>
                    {c.lightning_lane_tier && (
                      <span className={styles.pill} style={{ background: 'rgba(44,165,141,0.18)', color: 'var(--teal-dark)' }}>
                        <i className="ti ti-bolt" /> {LL_TIER_LABEL[c.lightning_lane_tier] || c.lightning_lane_tier}
                      </span>
                    )}
                    {c.dining_tier && (
                      <span className={styles.pill} style={{ background: 'rgba(245,181,54,0.18)', color: 'var(--gold-dark)' }}>
                        {DINING_TIER_LABEL[c.dining_tier] || c.dining_tier}
                      </span>
                    )}
                  </div>
                  {c.cuisine && <div className={styles.catCardCuisine}>{c.cuisine}</div>}
                </div>
                <button
                  type="button"
                  className={`${styles.heartBtn} ${saved ? styles.saved : ''}`}
                  onClick={() => onToggleSave(c)}
                  title={saved ? 'Remove' : 'Save'}
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
  )
}
