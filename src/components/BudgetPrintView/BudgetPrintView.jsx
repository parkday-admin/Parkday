import { categoryMeta } from '../../lib/categories'
import { paymentSourceLabel } from '../../lib/payments'
import styles from './BudgetPrintView.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDate(str) {
  return parseLocalDate(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDayDate(str) {
  return parseLocalDate(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Calendar date for a 1-based trip day number, given the trip's arrival date.
function dateForDay(arrivalDate, dayNum) {
  const d = parseLocalDate(arrivalDate)
  d.setDate(d.getDate() + (dayNum - 1))
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function partySize(trip) {
  const parts = []
  if (trip.adults) parts.push(`${trip.adults} adult${trip.adults === 1 ? '' : 's'}`)
  if (trip.children) parts.push(`${trip.children} child${trip.children === 1 ? '' : 'ren'}`)
  return parts.join(' · ')
}

function methodTag(source, giftCards, rewardPrograms) {
  if (!source || source.startsWith('manual:')) return null
  return paymentSourceLabel(source, giftCards, rewardPrograms)
}

function categoryStatus(row) {
  if (row.budgeted <= 0) return null
  if (row.actual > row.budgeted) return { label: 'Over', cls: 'statusOver' }
  if (row.actual / row.budgeted >= 0.9) return { label: 'Near limit', cls: 'statusNear' }
  return { label: 'On track', cls: 'statusOk' }
}

// Print-only budget report, portalled to document.body and shown only
// under @media print (see the "Export PDF" trigger in Budget.jsx) — the
// rest of the app shell is hidden for print via AppShell.module.css.
export default function BudgetPrintView({ trip, rows, entries, totals, giftCards, rewardPrograms }) {
  const tripRows = rows.filter(r => categoryMeta(r.cat).scope === 'trip')
  const dayRows = rows.filter(r => categoryMeta(r.cat).scope === 'day')

  return (
    <div className={styles.report}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.brandRow}>
            <img className={styles.logoMark} src="/assets/logos/parkday-icon.svg" alt="" />
            <div className={styles.wordmark}>Parkday</div>
          </div>
          <div className={styles.reportLabel}>Trip Budget Report</div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.tripName}>{trip.name}</div>
          <div className={styles.headerMeta}>
            {trip.accommodation ? `${trip.accommodation} · ` : ''}{fmtDate(trip.arrival_date)} – {fmtDate(trip.departure_date)}
          </div>
          {partySize(trip) && <div className={styles.headerMeta}>{partySize(trip)}</div>}
          <div className={styles.generatedOn}>Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
      </div>

      <div className={styles.summaryBar}>
        <div className={styles.summaryStat}>
          <div className={styles.summaryLbl}>Total Budget</div>
          <div className={styles.summaryValGold}>{fmt(totals.budgeted)}</div>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryStat}>
          <div className={styles.summaryLbl}>Planned</div>
          <div className={styles.summaryVal}>{fmt(totals.planned)}</div>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryStat}>
          <div className={styles.summaryLbl}>Spent</div>
          <div className={styles.summaryVal}>{fmt(totals.actual)}</div>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryStat}>
          <div className={styles.summaryLbl}>Remaining</div>
          <div className={styles.summaryVal} style={{ color: totals.remaining >= 0 ? '#2CA58D' : '#FF7A6B' }}>{fmt(totals.remaining)}</div>
        </div>
      </div>

      <div className={styles.sectionTitle}>Budget by Category</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thLeft}>Category</th>
            <th className={styles.thRight}>Budgeted</th>
            <th className={styles.thRight}>Planned</th>
            <th className={styles.thRight}>Spent</th>
            <th className={styles.thRight}>Status</th>
          </tr>
        </thead>
        <tbody>
          {tripRows.length > 0 && (
            <>
              <tr><td className={styles.groupLabel} colSpan={5}>Trip costs</td></tr>
              {tripRows.map(r => <CategoryRow key={r.cat} row={r} />)}
            </>
          )}
          {dayRows.length > 0 && (
            <>
              <tr><td className={styles.groupLabel} colSpan={5}>Daily spending</td></tr>
              {dayRows.map(r => <CategoryRow key={r.cat} row={r} />)}
            </>
          )}
          <tr className={styles.totalsRow}>
            <td className={styles.tdLeft}>Total</td>
            <td className={styles.tdRight}>{fmt(totals.budgeted)}</td>
            <td className={styles.tdRight}>{fmt(totals.planned)}</td>
            <td className={styles.tdRight}>{fmt(totals.actual)}</td>
            <td className={styles.tdRight}></td>
          </tr>
        </tbody>
      </table>

      <div className={styles.pageBreak} />

      <div className={styles.sectionTitle}>Expense Log</div>
      <div className={styles.sectionSub}>All logged expenses · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thLeft}>Date / Day</th>
            <th className={styles.thLeft}>Description</th>
            <th className={styles.thLeft}>Category</th>
            <th className={styles.thRight}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr><td className={styles.emptyRow} colSpan={4}>No expenses logged yet.</td></tr>
          ) : entries.map(e => {
            const meta = categoryMeta(e.cat)
            const tag = methodTag(e.payment_source, giftCards, rewardPrograms)
            const hasActual = e.actual_amt != null
            return (
              <tr key={e.id}>
                <td className={styles.tdLeft}>{e.day == null ? 'Trip' : `Day ${e.day} · ${fmtDayDate(dateForDay(trip.arrival_date, e.day))}`}</td>
                <td className={styles.tdLeft}>
                  <div className={styles.entryName}>{e.label || meta.label}</div>
                  {e.time && <div className={styles.entrySub}>{e.time}</div>}
                  {tag && <span className={styles.tag}>{tag}</span>}
                </td>
                <td className={styles.tdLeft}>{meta.label}</td>
                <td className={styles.tdRight}>
                  {hasActual ? (
                    <>
                      {e.planned_amt != null && e.planned_amt !== e.actual_amt && (
                        <span className={styles.struck}>{fmt(e.planned_amt)}</span>
                      )}
                      <span>{fmt(e.actual_amt)}</span>
                    </>
                  ) : fmt(e.planned_amt)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className={styles.footer}>
        <span>Parkday · planyourparkday.com</span>
        <span>Not affiliated with The Walt Disney Company.</span>
      </div>
    </div>
  )
}

function CategoryRow({ row }) {
  const meta = categoryMeta(row.cat)
  const status = categoryStatus(row)
  return (
    <tr>
      <td className={styles.tdLeft}>{meta.label}</td>
      <td className={styles.tdRight}>{fmt(row.budgeted)}</td>
      <td className={styles.tdRight}>{fmt(row.planned)}</td>
      <td className={styles.tdRight}>{fmt(row.actual)}</td>
      <td className={styles.tdRight}>{status && <span className={styles[status.cls]}>{status.label}</span>}</td>
    </tr>
  )
}
