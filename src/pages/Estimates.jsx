import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { fetchEstimates, renameEstimate, deleteEstimate, rowToConfiguratorPrefill, estimateCategoryCosts } from '../lib/estimates'
import { fmt, rng } from '../components/Estimator/estimatorLogic'
import styles from './Estimates.module.css'

const MAX_ESTIMATES = 3
const TBODY_ROW_COUNT = 10

const SEASON_LABELS = { value: 'Value', regular: 'Regular', peak: 'Peak' }
const RESORT_LABELS = { value: 'Value', moderate: 'Moderate', deluxe: 'Deluxe', deluxe_villa: 'Deluxe Villa', off_property: 'Off Property' }
const TICKET_LABELS = { base: 'Base', water_park: 'Water Park & Sports', hopper: 'Park Hopper', hopper_plus: 'Hopper Plus' }
const LL_LABELS = { none: 'None', multi_pass: 'Multi Pass', mp_plus_singles: 'MP + Singles', premier_pass: 'Premier Pass' }

function fmtCreated(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function diningSummary(e) {
  if (!e.dining_qs && !e.dining_ts && !e.dining_character && !e.dining_snacks) return 'Not included'
  const parts = []
  if (e.dining_qs) parts.push(`${e.dining_qs} QS`)
  if (e.dining_ts) parts.push(`${e.dining_ts} TS`)
  if (e.dining_character) parts.push(`${e.dining_character} char`)
  if (e.dining_snacks) parts.push(`${e.dining_snacks} snacks/day`)
  return parts.join(' · ')
}

function RowLabel({ icon, bg, ic, dark, children }) {
  return (
    <td className={`${styles.labelCol} ${dark ? styles.labelColDark : ''}`} title={typeof children === 'string' ? children : undefined}>
      <div className={styles.labelInner}>
        <span className={styles.labelIcon} style={{ background: bg }}><i className={`ti ${icon}`} style={{ color: ic }} /></span>
        <span className={styles.labelText}>{children}</span>
      </div>
    </td>
  )
}

function CellVal({ value, price }) {
  return (
    <td>
      <div className={styles.cellVal}>{value}</div>
      {price != null && <div className={styles.cellPrice}>{fmt(price)}</div>}
    </td>
  )
}

export default function Estimates() {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const { session, showToast } = outletContext ?? {}
  const userId = session?.user?.id

  const [estimates, setEstimates] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [nameDraft, setNameDraft] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (!userId) return
    fetchEstimates(userId).then(({ data }) => setEstimates(data))
  }, [userId])

  if (estimates === null) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} />
      </div>
    )
  }

  function startEditing(e) {
    setEditingId(e.id)
    setNameDraft(e.name)
  }

  async function commitName(e) {
    setEditingId(null)
    const trimmed = nameDraft.trim().slice(0, 40)
    const finalName = trimmed || e.name
    if (finalName === e.name) return
    setEstimates(prev => prev.map(x => x.id === e.id ? { ...x, name: finalName } : x))
    const { error } = await renameEstimate(e.id, finalName)
    if (error) showToast?.(error.message)
  }

  async function handleDelete(id) {
    setDeletingId(id)
    const { error } = await deleteEstimate(id)
    setDeletingId(null)
    setConfirmingId(null)
    if (error) { showToast?.(error.message); return }
    setEstimates(prev => prev.filter(e => e.id !== id))
  }

  function planThisTrip(e) {
    navigate('/configurator', { state: { prefill: rowToConfiguratorPrefill(e) } })
  }

  if (estimates.length === 0) {
    return (
      <div className={styles.emptyState}>
        <i className={`ti ti-calculator ${styles.emptyIcon}`} />
        <h1 className={styles.emptyTitle}>No estimates yet</h1>
        <p className={styles.emptySub}>
          Use the estimator to explore different trip scenarios — resort tiers, party sizes, ticket types — and save up to 3 to compare side by side.
        </p>
        <button type="button" className={styles.emptyBtn} onClick={() => navigate('/estimator')}>
          <i className="ti ti-calculator" /> Create an estimate
        </button>
      </div>
    )
  }

  const emptySlots = Math.max(0, MAX_ESTIMATES - estimates.length)

  return (
    <div>
      <div className={styles.scrollWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${styles.labelCol} ${styles.headCell}`} />
              {estimates.map(e => (
                <th key={e.id} className={styles.headCell}>
                  {editingId === e.id ? (
                    <input
                      autoFocus
                      className={styles.nameInp}
                      type="text"
                      maxLength={40}
                      value={nameDraft}
                      onChange={ev => setNameDraft(ev.target.value)}
                      onBlur={() => commitName(e)}
                      onKeyDown={ev => { if (ev.key === 'Enter') ev.currentTarget.blur() }}
                    />
                  ) : (
                    <div className={styles.colName} onClick={() => startEditing(e)} title="Tap to rename">
                      {e.name} <i className="ti ti-pencil" />
                    </div>
                  )}
                  <div className={styles.colDate}>{fmtCreated(e.created_at)}</div>
                </th>
              ))}
              {Array.from({ length: emptySlots }, (_, i) => (
                <th key={`ph-head-${i}`} className={`${styles.headCell} ${styles.placeholderHead}`} />
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <RowLabel icon="ti-moon" bg="rgba(13,35,64,0.08)" ic="var(--night)">Trip Length</RowLabel>
              {estimates.map(e => <td key={e.id}>{e.nights} night{e.nights !== 1 ? 's' : ''} · {e.park_days} park day{e.park_days !== 1 ? 's' : ''}</td>)}
              {Array.from({ length: emptySlots }, (_, i) => (
                <td key={`ph-${i}`} rowSpan={TBODY_ROW_COUNT} className={styles.placeholderCol}>
                  <button type="button" className={styles.placeholderBtn} onClick={() => navigate('/estimator')}>
                    <i className="ti ti-plus" />
                    <span>Add another estimate</span>
                  </button>
                </td>
              ))}
            </tr>
            <tr>
              <RowLabel icon="ti-users" bg="rgba(224,83,63,0.12)" ic="var(--coral)">Party</RowLabel>
              {estimates.map(e => <td key={e.id}>{e.adults} adult{e.adults !== 1 ? 's' : ''}{e.children > 0 ? `, ${e.children} children` : ''}</td>)}
            </tr>
            <tr>
              <RowLabel icon="ti-sun" bg="rgba(245,181,54,0.16)" ic="#C68A12">Travel Season</RowLabel>
              {estimates.map(e => <td key={e.id}>{SEASON_LABELS[e.season] || '—'}</td>)}
            </tr>
            <tr>
              <RowLabel icon="ti-building-castle" bg="rgba(13,35,64,0.08)" ic="var(--night)">Resort Tier</RowLabel>
              {estimates.map(e => {
                const costs = estimateCategoryCosts(e)
                return <CellVal key={e.id} value={RESORT_LABELS[e.resort_tier] || '—'} price={costs.accommodations} />
              })}
            </tr>
            <tr>
              <RowLabel icon="ti-ticket" bg="rgba(42,111,224,0.12)" ic="var(--sky-dark)">Ticket Type</RowLabel>
              {estimates.map(e => {
                const costs = estimateCategoryCosts(e)
                return <CellVal key={e.id} value={TICKET_LABELS[e.ticket_type] || '—'} price={costs.tickets} />
              })}
            </tr>
            <tr>
              <RowLabel icon="ti-bolt" bg="rgba(245,181,54,0.16)" ic="#C68A12">Lightning Lane</RowLabel>
              {estimates.map(e => {
                const costs = estimateCategoryCosts(e)
                return <CellVal key={e.id} value={LL_LABELS[e.lightning_lane] || '—'} price={costs.lightningLane} />
              })}
            </tr>
            <tr>
              <RowLabel icon="ti-tools-kitchen-2" bg="rgba(224,83,63,0.12)" ic="#E0533F">Dining</RowLabel>
              {estimates.map(e => {
                const costs = estimateCategoryCosts(e)
                return <CellVal key={e.id} value={diningSummary(e)} price={costs.dining} />
              })}
            </tr>
            <tr>
              <RowLabel icon="ti-gift" bg="rgba(44,165,141,0.16)" ic="#1B7D68">Extras</RowLabel>
              {estimates.map(e => {
                const total = (e.souvenirs || 0) + (e.experiences || 0)
                return <td key={e.id}>{total > 0 ? fmt(total) : 'None'}</td>
              })}
            </tr>
            <tr className={styles.costRow}>
              <RowLabel dark icon="ti-report-money" bg="rgba(255,255,255,0.14)" ic="var(--gold)">Estimated Cost</RowLabel>
              {estimates.map(e => (
                <td key={e.id}>
                  <div className={styles.costMid}>{fmt(e.cost_midpoint)}</div>
                  <div className={styles.costRng}>{rng(e.cost_lo, e.cost_hi)}</div>
                </td>
              ))}
            </tr>
            <tr>
              <td className={styles.labelCol}>&nbsp;</td>
              {estimates.map(e => (
                <td key={e.id}>
                  <div className={styles.actions}>
                    <div className={styles.actionsRow}>
                      <button type="button" className={styles.planBtn} onClick={() => planThisTrip(e)}>Plan this trip</button>
                      <button type="button" className={styles.trashBtn} title="Delete estimate" onClick={() => setConfirmingId(e.id)}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                    {confirmingId === e.id && (
                      <div className={styles.confirmRow}>
                        <span>Delete this estimate?</span>
                        <button type="button" className={styles.confirmYes} disabled={deletingId === e.id} onClick={() => handleDelete(e.id)}>
                          {deletingId === e.id ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button type="button" className={styles.confirmNo} onClick={() => setConfirmingId(null)}>Cancel</button>
                      </div>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
