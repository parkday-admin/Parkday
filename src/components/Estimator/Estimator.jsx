import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Estimator.module.css'
import {
  STEP_NAMES, EST_TOTAL, DEFAULT_S, LIM, CITIES, EXPERIENCES,
  RESORT_LABELS, TICKET_LABELS, LL_LABELS,
} from './estimatorData'
import { fmt, rng, calc, travelEst, driveStr, milesFrom, expLineTotal, buildEstimatePayload } from './estimatorLogic'
import { ResortSheet, TicketSheet, LightningLaneSheet, DiningSheet } from './SheetContent'

const ZIP_REGIONS = [
  [20000, 40.7, -74], [23000, 38.9, -77], [27000, 37.5, -77.4], [29000, 35.5, -79.5],
  [30000, 33.0, -80.5], [32000, 33.7, -84.4], [35000, 27.8, -82.5], [38000, 33.5, -86.8],
  [40000, 36.2, -86.8], [45000, 38.2, -85.7], [50000, 41.5, -82.0], [55000, 44.0, -92.5],
  [60000, 44.9, -93.3], [65000, 41.9, -87.6], [70000, 38.5, -92.5], [75000, 29.9, -90.1],
  [80000, 32.8, -96.8], [85000, 39.7, -104.9], [90000, 40.7, -111.9],
]
function zipToCoords(zip) {
  const z = parseInt(zip, 10)
  for (const [max, lat, lon] of ZIP_REGIONS) if (z < max) return [lat, lon]
  return [34.1, -118.2]
}

function Option({ selected, onClick, name, sub, badge, badgeClass, wide }) {
  return (
    <button
      type="button"
      className={`${styles.opt} ${selected ? styles.sel : ''}`}
      style={wide ? { gridColumn: 'span 2' } : undefined}
      onClick={onClick}
    >
      <span className={styles.ochk}><i className="ti ti-check" /></span>
      <span className={styles.oname}>{name}</span>
      {sub && <div className={styles.osub}>{sub}</div>}
      {badge && <span className={`${styles.obdg} ${styles[badgeClass]}`}>{badge}</span>}
    </button>
  )
}

function Stepper({ label, hint, value, onDec, onInc }) {
  return (
    <div className={styles.stpr}>
      <div style={{ flex: 1 }}>
        <div className={styles.stprName}>{label}</div>
        {hint && <div className={styles.stprHint}>{hint}</div>}
      </div>
      <div className={styles.stprCtrl}>
        <button type="button" className={styles.sbtn} onClick={onDec}>−</button>
        <div className={styles.sval}>{value}</div>
        <button type="button" className={styles.sbtn} onClick={onInc}>+</button>
      </div>
    </div>
  )
}

export default function Estimator() {
  const navigate = useNavigate()
  const [S, setS] = useState(DEFAULT_S)
  const [step, setStep] = useState(0)
  const [skipped, setSkipped] = useState({ travel: false })
  const [originMiles, setOriginMiles] = useState(null)
  const [originLabel, setOriginLabel] = useState('')
  const [locInput, setLocInput] = useState('')
  const [locError, setLocError] = useState(null)
  const [locBtnLabel, setLocBtnLabel] = useState('Use my location')
  const [expSelected, setExpSelected] = useState(() => new Set())
  const [activeSheet, setActiveSheet] = useState(null)

  const setField = (key, value) => setS(prev => ({ ...prev, [key]: value }))

  function stepperChange(key, delta) {
    setS(prev => {
      const [mn, mx] = LIM[key]
      const next = { ...prev, [key]: Math.max(mn, Math.min(mx, prev[key] + delta)) }
      if (key === 'nights') {
        if (next.nights === 0) next.parkdays = Math.min(next.parkdays, 1)
        if (next.parkdays > next.nights && next.nights > 0) next.parkdays = next.nights
      }
      if (key === 'parkdays' && next.parkdays > next.nights && next.nights > 0) next.nights = next.parkdays
      return next
    })
  }

  function selectOption(group, value) {
    if (group === 'travel') {
      if (value === 'skip') setSkipped({ travel: true })
      else { setSkipped({ travel: false }); setField('travel', value) }
    } else {
      setField(group, value)
    }
  }

  function goTo(next) {
    const dir = next > step ? 1 : -1
    let s = next
    if (s === 2 && S.nights === 0 && dir > 0) s = 3
    if (s === 2 && S.nights === 0 && dir < 0) s = 1
    setStep(s)
  }

  function restart() {
    setS(DEFAULT_S)
    setStep(0)
    setSkipped({ travel: false })
    setOriginMiles(null)
    setOriginLabel('')
    setLocInput('')
    setLocError(null)
    setLocBtnLabel('Use my location')
    setExpSelected(new Set())
    setActiveSheet(null)
  }

  function setOrigin(lat, lon, label) {
    setOriginMiles(milesFrom(lat, lon))
    setOriginLabel(label)
    setLocError(null)
  }

  useEffect(() => {
    const val = locInput.trim().toLowerCase()
    if (val.length < 2) return undefined
    const timer = setTimeout(() => {
      for (const [k, coords] of Object.entries(CITIES)) {
        if (val === k || val.includes(k) || k.includes(val)) { setOrigin(coords[0], coords[1], locInput.trim()); return }
      }
      if (/^\d{5}$/.test(val)) {
        const [lat, lon] = zipToCoords(val)
        setOrigin(lat, lon, 'ZIP ' + val)
        return
      }
      setLocError('City not found — try a major city or 5-digit zip.')
    }, 400)
    return () => clearTimeout(timer)
  }, [locInput])

  function useMyLocation() {
    if (!navigator.geolocation) { setLocBtnLabel('Not supported'); return }
    setLocBtnLabel('Locating…')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocBtnLabel('Located ✓')
        setOrigin(pos.coords.latitude, pos.coords.longitude, `Your location (${pos.coords.latitude.toFixed(1)}°, ${pos.coords.longitude.toFixed(1)}°)`)
      },
      () => {
        setLocBtnLabel('Use my location')
        setLocError('Access denied — type your city below.')
      },
    )
  }

  function toggleExperience(id) {
    setExpSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const expSubtotal = EXPERIENCES.filter(e => expSelected.has(e.id)).reduce((sum, e) => sum + expLineTotal(e, S), 0)

  function useExperiencesEstimate() {
    setField('experiences', expSubtotal)
    setActiveSheet(null)
  }

  function startPlanningTrip() {
    const c = calc(S, step, skipped, originMiles)
    const payload = buildEstimatePayload(S, skipped, c)
    localStorage.setItem('pkd_estimate', JSON.stringify(payload))
    navigate('/login')
  }

  const t = S.adults + S.children
  const c = calc(S, step, skipped, originMiles)
  const tv = travelEst(S, skipped, originMiles)
  const showTravelEst = tv.lo > 0 || tv.hi > 0

  const qHint = S.qs > 0 ? `~$12–20/person · est. ${rng(12 * S.qs * t * S.parkdays, 20 * S.qs * t * S.parkdays)}` : '~$12–20/person'
  const tsHint = S.ts > 0 ? `~$45–75/person · est. ${rng(45 * S.ts * t * S.parkdays, 75 * S.ts * t * S.parkdays)}` : '~$45–75/person'
  const chHint = S.character > 0 ? `~$60–95/person · est. ${rng(60 * S.character * t, 95 * S.character * t)}` : '~$60–95/person · total'
  const snHint = S.snacks > 0 ? `~$6–14 each · est. ${rng(6 * S.snacks * t * S.parkdays, 14 * S.snacks * t * S.parkdays)}` : '~$6–14 each'

  return (
    <div className={styles.estEmbed}>
      <div className={styles.estShell}>
        <div className={styles.estToolbar}>
          <button type="button" className={styles.estResetBtn} onClick={restart}>
            <i className="ti ti-rotate-2" />Reset
          </button>
        </div>

        <div className={styles.costWrap}>
          <div className={styles.costTicket}>
            <div className={styles.costLeft}>
              <div className={styles.costLbl}>Estimated cost</div>
              <div className={styles.costNum}>{fmt(c.total)}</div>
            </div>
            <div className={styles.costDivider} />
            <div className={styles.costMid}>
              <div className={styles.costLbl}>Low to high range</div>
              <div className={styles.costRng}>{rng(c.totalLo, c.totalHi)}</div>
            </div>
            <div className={styles.costDivider} />
            <div className={styles.costRight}>
              <div className={styles.costLbl}>Per person</div>
              <div className={styles.costPp}>{t > 0 ? fmt(c.total / t) : '—'}</div>
            </div>
          </div>
        </div>

        <div className={styles.progWrap}>
          <div className={styles.progSteps}>
            {Array.from({ length: EST_TOTAL + 1 }, (_, i) => {
              let cls = styles.ps
              if (i < step) cls += ` ${styles.done}`
              else if (i === step) cls += ` ${styles.active}`
              if (i === 1 && skipped.travel) cls += ` ${styles.skipped}`
              if (i === 2 && S.nights === 0) cls += ` ${styles.skipped}`
              return <div key={i} className={cls} />
            })}
          </div>
          <div className={styles.progLbl}>
            <span className={styles.plStep}>{step < EST_TOTAL ? `Step ${step + 1} of ${EST_TOTAL}` : 'Summary'}</span>
            <span>·</span>
            <span className={styles.plName}>{STEP_NAMES[step]}</span>
          </div>
        </div>

        <div className={styles.screens}>
          <div key={step} className={styles.screen}>

            {step === 0 && (
              <>
                <div className={styles.secTitle}>Who's going?</div>
                <div className={styles.secDesc}>Tell us about your party and how long you're staying.</div>
                <div className={styles.steppers}>
                  <Stepper label="Adults" value={S.adults} onDec={() => stepperChange('adults', -1)} onInc={() => stepperChange('adults', 1)} />
                  <Stepper label={<>Children <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(ages 3–9)</span></>} value={S.children} onDec={() => stepperChange('children', -1)} onInc={() => stepperChange('children', 1)} />
                  <Stepper label="Nights at resort" hint={S.nights === 0 ? 'Day trip — no overnight stay' : 'Staying overnight'} value={S.nights} onDec={() => stepperChange('nights', -1)} onInc={() => stepperChange('nights', 1)} />
                  <Stepper label="Park days" value={S.parkdays} onDec={() => stepperChange('parkdays', -1)} onInc={() => stepperChange('parkdays', 1)} />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className={styles.secTitle}>Getting there</div>
                <div className={styles.secDesc}>How are you getting to Orlando? Enter your origin for a rough travel estimate.</div>
                <div className={`${styles.og} ${styles.g3}`}>
                  <Option name="Flying" sub="Fly into MCO" badge="Airfare + transfer" badgeClass="bb" selected={!skipped.travel && S.travel === 'flying'} onClick={() => selectOption('travel', 'flying')} />
                  <Option name="Driving" sub="Road trip to WDW" badge="Gas + parking" badgeClass="bo" selected={!skipped.travel && S.travel === 'driving'} onClick={() => selectOption('travel', 'driving')} />
                  <Option name="Skip for now" sub="Exclude travel from estimate" badge="Not included" badgeClass="bz" selected={skipped.travel} onClick={() => selectOption('travel', 'skip')} />
                </div>
                {!skipped.travel && (
                  <div>
                    <div className={styles.locRow}>
                      <button type="button" className={styles.locBtn} onClick={useMyLocation}>
                        <i className="ti ti-current-location" /> {locBtnLabel}
                      </button>
                      <input className={styles.locInp} type="text" placeholder="City or zip code" value={locInput} onChange={e => setLocInput(e.target.value)} />
                    </div>
                    {(originMiles !== null || locError) && (
                      <div className={`${styles.locRes} ${styles.show}`}>
                        {locError ?? `${originLabel} — ${S.travel === 'driving' ? driveStr(originMiles) : `${Math.round(originMiles)} mi from Orlando`}`}
                      </div>
                    )}
                    {showTravelEst && (
                      <div className={`${styles.travelEst} ${styles.show}`}>
                        <div className={styles.teRow}>
                          <div className={styles.teLbl}>{S.travel === 'flying' ? 'Estimated round-trip cost' : 'Estimated travel cost'}</div>
                          <div className={styles.teVal}>{rng(tv.lo, tv.hi)}</div>
                        </div>
                        <div className={styles.teNote}>
                          {S.travel === 'flying' ? "Airfare + Mears Connect transfer. Full detail in the planner." : `Gas (round-trip, est.) + WDW parking ($30/park day). Full detail in the planner.`}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <div className={styles.secTitle}>When & where to stay</div>
                <div className={styles.secDesc}>Season and resort tier are the two biggest drivers of your total cost.</div>
                <div className={styles.screenSectionLbl}>Travel season</div>
                <div className={`${styles.og} ${styles.g3}`} style={{ marginBottom: 4 }}>
                  <Option name="Value" sub="Jan, late Aug–Sep" badge="Cheapest" badgeClass="bg" selected={S.season === 'value'} onClick={() => selectOption('season', 'value')} />
                  <Option name="Regular" sub="Feb–Mar, Jun, Oct" badge="Popular" badgeClass="bb" selected={S.season === 'regular'} onClick={() => selectOption('season', 'regular')} />
                  <Option name="Peak" sub="Spring break, holidays" badge="Priciest" badgeClass="bc" selected={S.season === 'peak'} onClick={() => selectOption('season', 'peak')} />
                </div>
                <div className={styles.screenSectionLbl}>Resort tier <span className={styles.infoLink} onClick={() => setActiveSheet('resort')}>What's this?</span></div>
                <div className={`${styles.og} ${styles.g2}`}>
                  <Option name="Value" sub="All-Star, Pop, Art of Animation" badge="$130–$280/night" badgeClass="bg" selected={S.resort === 'value'} onClick={() => selectOption('resort', 'value')} />
                  <Option name="Moderate" sub="Caribbean Beach, Port Orleans" badge="$220–$450/night" badgeClass="bb" selected={S.resort === 'moderate'} onClick={() => selectOption('resort', 'moderate')} />
                  <Option name="Deluxe" sub="Grand Floridian, Polynesian…" badge="$430–$1,100/night" badgeClass="bo" selected={S.resort === 'deluxe'} onClick={() => selectOption('resort', 'deluxe')} />
                  <Option name="Deluxe Villa" sub="DVC resorts" badge="$500–$1,350/night" badgeClass="bc" selected={S.resort === 'villa'} onClick={() => selectOption('resort', 'villa')} />
                  <Option wide name="Offsite hotel" sub="No Disney transport or early entry perks" badge="$100–$250/night" badgeClass="bz" selected={S.resort === 'offsite'} onClick={() => selectOption('resort', 'offsite')} />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className={styles.secTitle}>Tickets & Lightning Lane</div>
                <div className={styles.secDesc}>What kind of park access are you planning?</div>
                <div className={styles.screenSectionLbl}>Ticket type <span className={styles.infoLink} onClick={() => setActiveSheet('ticket')}>What's this?</span></div>
                <div className={`${styles.og} ${styles.g2}`} style={{ marginBottom: 4 }}>
                  <Option name="Base" sub="One park per day" badge="No add-on" badgeClass="bg" selected={S.ticket === 'base'} onClick={() => selectOption('ticket', 'base')} />
                  <Option name="Water Park & Sports" sub="Base + water parks & golf" badge="+$74–80/pp/day" badgeClass="bb" selected={S.ticket === 'wpas'} onClick={() => selectOption('ticket', 'wpas')} />
                  <Option name="Park Hopper" sub="Multiple parks/day" badge="+$80–100/day" badgeClass="bo" selected={S.ticket === 'hopper'} onClick={() => selectOption('ticket', 'hopper')} />
                  <Option name="Hopper Plus" sub="Park Hopper + water parks & sports" badge="+$100–130/day" badgeClass="bc" selected={S.ticket === 'hopperplus'} onClick={() => selectOption('ticket', 'hopperplus')} />
                </div>
                <div className={styles.screenSectionLbl}>Lightning Lane <span className={styles.infoLink} onClick={() => setActiveSheet('ll')}>What's this?</span></div>
                <div className={`${styles.og} ${styles.g3}`}>
                  <Option name="None" sub="Standby only" badge="Free" badgeClass="bg" selected={S.ll === 'none'} onClick={() => selectOption('ll', 'none')} />
                  <Option name="Multi Pass" sub="Multiple rides/day" badge="~$15–25/pp/day" badgeClass="bb" selected={S.ll === 'multipass'} onClick={() => selectOption('ll', 'multipass')} />
                  <Option name="MP + Singles" sub="Tron, Cosmic Rewind…" badge="~$55–90/pp/day" badgeClass="bc" selected={S.ll === 'singles'} onClick={() => selectOption('ll', 'singles')} />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className={styles.secTitle}>Dining <span className={styles.infoLink} onClick={() => setActiveSheet('dining')}>What's this?</span></div>
                <div className={styles.secDesc}>How many meals of each type are you planning? Tips are estimated automatically on sit-down meals.</div>
                <div className={styles.steppers} style={{ marginBottom: 10 }}>
                  <Stepper label="Quick service meals/day" hint={qHint} value={S.qs} onDec={() => stepperChange('qs', -1)} onInc={() => stepperChange('qs', 1)} />
                  <Stepper label="Table service meals/day" hint={tsHint} value={S.ts} onDec={() => stepperChange('ts', -1)} onInc={() => stepperChange('ts', 1)} />
                  <Stepper label="Character dining meals" hint={chHint} value={S.character} onDec={() => stepperChange('character', -1)} onInc={() => stepperChange('character', 1)} />
                  <Stepper label="Snacks per person/day" hint={snHint} value={S.snacks} onDec={() => stepperChange('snacks', -1)} onInc={() => stepperChange('snacks', 1)} />
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className={styles.secTitle}>Extras</div>
                <div className={styles.secDesc}>Enter what you expect to spend on souvenirs and special experiences. Leave at $0 to exclude from the estimate.</div>
                <div className={styles.openCard}>
                  <div className={styles.openTop}>
                    <div className={styles.openIcon} style={{ background: 'rgba(232,97,74,0.12)' }}><i className="ti ti-gift" style={{ color: '#E8614A' }} /></div>
                    <div>
                      <div className={styles.openTitle}>Souvenirs & merchandise</div>
                      <div className={styles.openSub}>Clothing, toys, pins, snacks to take home…</div>
                    </div>
                  </div>
                  <div className={styles.amtField}>
                    <div className={styles.estAmtPre}>$</div>
                    <input type="number" placeholder="0" min="0" step="10" value={S.souvenirs || ''} onChange={e => setField('souvenirs', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className={styles.refTags}>
                    <div className={styles.refLbl}>Quick picks:</div>
                    {[[50, 'light'], [150, 'moderate'], [300, 'splurge'], [500, 'no limits']].map(([val, lbl]) => (
                      <span key={val} className={styles.refTag} onClick={() => setField('souvenirs', val)}>${val} {lbl}</span>
                    ))}
                  </div>
                </div>
                <div className={styles.openCard}>
                  <div className={styles.openTop}>
                    <div className={styles.openIcon} style={{ background: 'rgba(246,184,75,0.15)' }}><i className="ti ti-stars" style={{ color: '#c47c00' }} /></div>
                    <div>
                      <div className={styles.openTitle}>Experiences</div>
                      <div className={styles.openSub}>Memory Maker, tours, Bibbidi Bobbidi, after-hours…</div>
                    </div>
                  </div>
                  <div className={styles.amtField}>
                    <div className={styles.estAmtPre}>$</div>
                    <input type="number" placeholder="0" min="0" step="10" value={S.experiences || ''} onChange={e => setField('experiences', parseFloat(e.target.value) || 0)} />
                  </div>
                  <button type="button" className={styles.builderBtn} onClick={() => setActiveSheet('experiences')}>
                    <i className="ti ti-list-check" /> {S.experiences > 0 ? `Edit in add-on builder (${fmt(S.experiences)} selected)` : 'Not sure? Build an estimate from common add-ons'}
                  </button>
                </div>
              </>
            )}

            {step === 6 && (
              <Summary S={S} skipped={skipped} c={c} originMiles={originMiles} onStart={startPlanningTrip} />
            )}

          </div>
        </div>

        <div className={styles.estNav}>
          {step === EST_TOTAL ? (
            <div className={styles.navRow}>
              <button type="button" className={styles.navBack} onClick={() => goTo(step - 1)}>← Back</button>
            </div>
          ) : (
            <div className={styles.navRow}>
              {step > 0 && <button type="button" className={styles.navBack} onClick={() => goTo(step - 1)}>← Back</button>}
              <button type="button" className={styles.navNext} onClick={() => goTo(step + 1)}>
                {step === EST_TOTAL - 1 ? <>See my estimate <i className="ti ti-sparkles" /></> : <>Next <i className="ti ti-arrow-right" /></>}
              </button>
            </div>
          )}
        </div>

      </div>

      {activeSheet && (
        <>
          <div className={styles.sheetBackdrop} onClick={() => setActiveSheet(null)} />
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHdr}>
              <div className={styles.sheetTitle}>
                {{ resort: 'Resort tiers', ticket: 'Ticket types', ll: 'Lightning Lane', dining: 'Dining at Disney', experiences: 'Experiences & add-ons' }[activeSheet]}
              </div>
              <button type="button" className={styles.sheetClose} onClick={() => setActiveSheet(null)}><i className="ti ti-x" /></button>
            </div>
            <div className={styles.sheetBody}>
              {activeSheet === 'resort' && <ResortSheet />}
              {activeSheet === 'ticket' && <TicketSheet />}
              {activeSheet === 'll' && <LightningLaneSheet />}
              {activeSheet === 'dining' && <DiningSheet />}
              {activeSheet === 'experiences' && (
                <>
                  <div className={styles.siDesc} style={{ marginBottom: 12 }}>Tap to add any special experiences you're planning. These are rough per-item estimates — per-person items scale with your party size — toggle what you're considering and we'll total it up below.</div>
                  {EXPERIENCES.map(e => (
                    <div key={e.id} className={`${styles.expCard} ${expSelected.has(e.id) ? styles.sel : ''}`} onClick={() => toggleExperience(e.id)}>
                      <div className={styles.expTop}>
                        <div>
                          <div className={styles.expName}>{e.name}</div>
                          <div className={styles.expPark}>{e.park}</div>
                        </div>
                        <div className={styles.expCheck}><i className="ti ti-check" /></div>
                      </div>
                      <div className={styles.expDesc}>{e.desc}</div>
                      <div className={styles.expBottom}>
                        <div className={styles.expPrice}>{e.price}</div>
                        {e.seasonal && <span className={styles.expSeasonal}>Seasonal · {e.seasonal}</span>}
                      </div>
                      {e.pp && <div className={styles.expPpNote}>{fmt(e.val)}/pp × {t} guest{t !== 1 ? 's' : ''} = {fmt(expLineTotal(e, S))}</div>}
                    </div>
                  ))}
                </>
              )}
            </div>
            {activeSheet === 'experiences' && (
              <div className={styles.expSubtotal}>
                <div className={styles.expSubRow}>
                  <div className={styles.expSubLbl}>Subtotal <span className={styles.expClear} onClick={() => setExpSelected(new Set())}>Clear selections</span></div>
                  <div className={styles.expSubVal}>{fmt(expSubtotal)}</div>
                </div>
                <button type="button" className={styles.expUseBtn} onClick={useExperiencesEstimate}>Use this estimate</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Summary({ S, skipped, c, originMiles, onStart }) {
  const skippedItems = []
  if (skipped.travel) skippedItems.push('travel costs')

  return (
    <>
      <div className={styles.secTitle}>Cost breakdown</div>
      <div className={styles.secDesc}>Here's how your {fmt(c.total)} estimate breaks down.</div>
      {skippedItems.length > 0 && (
        <div className={styles.skippedNote}><strong>Not included:</strong> {skippedItems.join(' and ')} were skipped.</div>
      )}
      <div className={styles.bkCard}>
        {c.lines.map((l, i) => {
          const mid = (l.lo + l.hi) / 2
          if (mid < 1) return null
          return (
            <div key={i} className={styles.bkRow}>
              <div className={styles.bkLeft}>
                <div className={styles.bkIcon} style={{ background: l.bg }}><i className={`ti ${l.icon}`} style={{ color: l.ic }} /></div>
                <div className={styles.bkName}>{l.name}</div>
              </div>
              <div className={styles.bkRight}>
                <div className={styles.bkMid}>{fmt(mid)}</div>
                <div className={styles.bkRng}>{l.lo === l.hi ? 'Fixed' : rng(l.lo, l.hi)}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div className={styles.sumSel}>
        <div className={styles.bkHdr}>Your selections</div>
        <div className={styles.selRow}><div className={styles.selLbl}>Party</div><div className={styles.selVal}>{S.adults} adult{S.adults !== 1 ? 's' : ''}{S.children > 0 ? ' · ' + S.children + ' children' : ''}</div></div>
        <div className={styles.selRow}><div className={styles.selLbl}>Stay</div><div className={styles.selVal}>{S.nights === 0 ? `Day trip · ${S.parkdays} park day${S.parkdays !== 1 ? 's' : ''}` : `${S.nights} nights · ${S.parkdays} park days · ${S.season} season`}</div></div>
        <div className={styles.selRow}><div className={styles.selLbl}>Resort</div><div className={styles.selVal}>{S.nights === 0 ? 'Day trip — no overnight stay' : RESORT_LABELS[S.resort]}</div></div>
        <div className={styles.selRow}><div className={styles.selLbl}>Tickets</div><div className={styles.selVal}>{TICKET_LABELS[S.ticket]}</div></div>
        <div className={styles.selRow}><div className={styles.selLbl}>Lightning Lane</div><div className={styles.selVal}>{LL_LABELS[S.ll]}</div></div>
        <div className={styles.selRow}><div className={styles.selLbl}>Travel</div><div className={styles.selVal}>{skipped.travel ? 'Not included' : (S.travel === 'flying' ? 'Flying into MCO' : 'Driving') + (originMiles ? ' · ' + Math.round(originMiles) + ' mi' : '')}</div></div>
        <div className={styles.selRow}><div className={styles.selLbl}>Dining</div><div className={styles.selVal}>{S.ts} TS · {S.qs} QS · {S.character} char · {S.snacks} snacks/day</div></div>
      </div>
      <div className={styles.convertCard}>
        <div className={styles.ccTitle}>Ready to plan your trip?</div>
        <div className={styles.ccSub}>Create your account and choose a plan to save this estimate and start building your full trip — dates, resort, and park days.</div>
        <button type="button" className={styles.ccBtn} onClick={onStart}>Start planning your trip →</button>
      </div>
    </>
  )
}
