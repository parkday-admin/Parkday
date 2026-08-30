import { categoryMeta } from '../../lib/categories'
import { dayParkLabel } from '../../lib/trips'
import { usesFor } from '../../lib/giftFunds'
import Sheet from '../Sheet/Sheet'
import styles from './UsageSheet.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

export default function UsageSheet({ trip, expenses, state, onClose, onJump }) {
  if (!state) return null

  const { kind, source } = state
  const items = usesFor(expenses, kind, source.id).slice().sort((a, b) => (a.day || 0) - (b.day || 0))
  const title = `Used on ${kind === 'gift' ? source.source : source.program}`

  return (
    <Sheet open={!!state} onClose={onClose}>
      <div className={styles.hdr}>
        <div className={styles.title}>{title}</div>
      </div>

      <div className={styles.body}>
        {items.length === 0 ? (
          <div className={styles.empty}>Not used on anything yet.</div>
        ) : items.map(e => {
          const meta = categoryMeta(e.cat)
          const dayLabel = e.day == null ? 'Trip cost' : `Day ${e.day} · ${dayParkLabel(trip, expenses, e.day)}`
          return (
            <div key={e.id} className={styles.row} onClick={() => onJump(e)}>
              <div className={styles.icon} style={{ background: meta.bg }}><i className={`ti ${meta.icon}`} style={{ color: meta.color }} /></div>
              <div className={styles.info}>
                <div className={styles.name}>{e.label}</div>
                <div className={styles.sub}>{dayLabel}</div>
              </div>
              <div className={styles.amt}>{fmt(e.actual_amt ?? e.planned_amt)}</div>
              <i className={`ti ti-chevron-right ${styles.chevron}`} />
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
