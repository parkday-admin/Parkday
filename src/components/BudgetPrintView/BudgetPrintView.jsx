import { categoryMeta } from '../../lib/categories'
import { paymentSourceLabel } from '../../lib/payments'
import { tripDays } from '../../lib/trips'
import styles from './BudgetPrintView.module.css'

// Fixed hex palette for the category pie chart — the app's own per-category
// colors repeat (dining/snacks/souvenirs are all "coral"), which reads fine
// as a single-category accent on screen but makes an all-categories pie
// chart illegible. This palette instead assigns every category its own
// distinct, brand-derived hue.
const PIE_PALETTE = ['#0D2340', '#2A6FE0', '#F5B536', '#E0533F', '#2CA58D', '#1E5AC4', '#C68A12', '#1B7D68', '#F0847A', '#8A8F9B']

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

// Simple bar chart of actual spend per trip day.
function DayBarChart({ dayTotals }) {
  const w = 320, h = 130, padBottom = 20, padTop = 14
  const max = Math.max(1, ...dayTotals.map(d => d.actual))
  const n = dayTotals.length
  const barW = Math.min(30, (w - 20) / n - 8)
  const gap = (w - 20 - barW * n) / Math.max(1, n - 1)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.chartSvg}>
      {dayTotals.map((d, i) => {
        const x = 10 + i * (barW + gap)
        const barH = d.actual > 0 ? Math.max(3, (d.actual / max) * (h - padTop - padBottom)) : 0
        const y = h - padBottom - barH
        return (
          <g key={d.day}>
            {d.actual > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="8" fill="#0D2340">{fmt(d.actual)}</text>
            )}
            <rect x={x} y={y} width={barW} height={barH} rx={2} fill="#2A6FE0" />
            <rect x={x} y={h - padBottom} width={barW} height={1} fill="rgba(13,35,64,0.15)" />
            <text x={x + barW / 2} y={h - padBottom + 12} textAnchor="middle" fontSize="8" fill="rgba(13,35,64,0.55)">{`D${d.day}`}</text>
          </g>
        )
      })}
    </svg>
  )
}

// Donut chart of actual spend by category, built from stacked stroke-
// dasharray circles rather than arc paths — simpler and just as reliable
// for print.
function CategoryDonut({ slices }) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  const r = 42, cx = 60, cy = 60, sw = 20
  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <svg viewBox="0 0 120 120" className={styles.donutSvg}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EDE9E1" strokeWidth={sw} />
      {total > 0 && slices.filter(d => d.value > 0).map(d => {
        const len = (d.value / total) * circumference
        const el = (
          <circle
            key={d.label}
            cx={cx} cy={cy} r={r} fill="none"
            stroke={d.color} strokeWidth={sw}
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )
        offset += len
        return el
      })}
    </svg>
  )
}

// Per-category horizontal bar: filled bar = actual spend, dark tick = the
// budgeted target, both scaled against the largest budgeted/actual value.
function ComparisonBars({ rows }) {
  const relevant = rows.filter(r => r.budgeted > 0 || r.actual > 0)
  const max = Math.max(1, ...relevant.map(r => Math.max(r.budgeted, r.actual)))
  return (
    <div className={styles.compareList}>
      {relevant.map(r => {
        const meta = categoryMeta(r.cat)
        const over = r.actual > r.budgeted
        return (
          <div key={r.cat} className={styles.compareRow}>
            <div className={styles.compareLbl}>{meta.label}</div>
            <div className={styles.compareTrack}>
              <div className={styles.compareFill} style={{ width: `${Math.min(100, (r.actual / max) * 100)}%`, background: over ? '#E0533F' : '#2CA58D' }} />
              <div className={styles.compareMarker} style={{ left: `${Math.min(100, (r.budgeted / max) * 100)}%` }} />
            </div>
            <div className={styles.compareVals}>{fmt(r.actual)} <span className={styles.compareValsSep}>/</span> {fmt(r.budgeted)}</div>
          </div>
        )
      })}
    </div>
  )
}

// Print-only budget/trip report, portalled to document.body and shown only
// under @media print (see the "Export PDF" triggers in Budget.jsx and
// ArchivedTripView.jsx) — the rest of the app shell is hidden for print via
// AppShell.module.css.
//
// tripDetail and wishlist are optional — only ArchivedTripView passes them
// (an array of {title, rows: [{label, value}]} sections, and scheduled
// wish-list items respectively), so Budget.jsx's export is unaffected.
export default function BudgetPrintView({ trip, rows, entries, totals, giftCards, rewardPrograms, tripDetail, wishlist }) {
  const tripRows = rows.filter(r => categoryMeta(r.cat).scope === 'trip')
  const dayRows = rows.filter(r => categoryMeta(r.cat).scope === 'day')

  const dayTotals = tripDays(trip).map(d => ({
    day: d.day,
    actual: entries.filter(e => e.day === d.day).reduce((s, e) => s + (e.actual_amt || 0), 0),
  }))
  const pieSlices = rows.map((r, i) => ({ label: categoryMeta(r.cat).label, value: r.actual, color: PIE_PALETTE[i % PIE_PALETTE.length] }))

  return (
    <div className={styles.report}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.brandRow}>
            <img className={styles.logoMark} src="/assets/logos/parkday-icon.svg" alt="" />
            <div className={styles.wordmark}>Parkday</div>
          </div>
          <div className={styles.reportLabel}>{tripDetail ? 'Trip Report' : 'Trip Budget Report'}</div>
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

      {tripDetail && tripDetail.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Trip Details</div>
          <div className={styles.detailGrid}>
            {tripDetail.map(section => (
              <div key={section.title} className={styles.detailCard}>
                <div className={styles.detailTitle}>{section.title}</div>
                {section.rows.map(r => (
                  <div key={r.label} className={styles.detailRow}>
                    <span className={styles.detailLbl}>{r.label}</span>
                    <span className={styles.detailVal}>{r.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.summaryBar}>
        <div className={styles.summaryStat}>
          <div className={styles.summaryLbl}>Total Budget</div>
          <div className={styles.summaryValGold}>{fmt(totals.budgeted)}</div>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryStat}>
          <div className={styles.summaryLbl}>Planned</div>
          <div className={styles.summaryVal} style={{ color: '#2A6FE0' }}>{fmt(totals.planned)}</div>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryStat}>
          <div className={styles.summaryLbl}>Spent</div>
          <div className={styles.summaryVal} style={{ color: '#E0533F' }}>{fmt(totals.actual)}</div>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryStat}>
          <div className={styles.summaryLbl}>Remaining</div>
          <div className={styles.summaryVal} style={{ color: totals.remaining >= 0 ? '#2CA58D' : '#E0533F' }}>{fmt(totals.remaining)}</div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Spending by Day</div>
          <DayBarChart dayTotals={dayTotals} />
        </div>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Spending by Category</div>
          {totals.actual > 0 ? (
            <div className={styles.donutRow}>
              <CategoryDonut slices={pieSlices} />
              <div className={styles.legend}>
                {pieSlices.filter(d => d.value > 0).map(d => (
                  <div key={d.label} className={styles.legendRow}>
                    <span className={styles.legendSwatch} style={{ background: d.color }} />
                    {d.label}
                    <span className={styles.legendPct}>{Math.round((d.value / totals.actual) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.chartEmpty}>No spending logged yet.</div>
          )}
        </div>
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>Spent vs. Budgeted</div>
        <ComparisonBars rows={rows} />
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

      {wishlist && wishlist.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Wish List</div>
          <div className={styles.sectionSub}>Scheduled items · {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thLeft}>Day</th>
                <th className={styles.thLeft}>Park</th>
                <th className={styles.thLeft}>Item</th>
              </tr>
            </thead>
            <tbody>
              {wishlist.map(w => (
                <tr key={w.id}>
                  <td className={styles.tdLeft}>Day {w.planned_day}</td>
                  <td className={styles.tdLeft}>{w.park || '—'}</td>
                  <td className={styles.tdLeft}>{w.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

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
