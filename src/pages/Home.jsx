import { useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './Home.module.css'
import Estimator from '../components/Estimator/Estimator'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'

const FAQS = [
  {
    q: 'Is the cost estimator really free?',
    a: 'Yes — no account or credit card needed. Answer a few questions about your trip and get an estimate in about two minutes.',
  },
  {
    q: 'Do I need Parkday Plus to use Parkday?',
    a: 'No. Parkday Starter covers the free cost estimator and a basic trip summary. Plus unlocks unlimited trips, scenario comparison, and the full budget and itinerary planning tools.',
  },
  {
    q: 'Does Parkday book anything for me?',
    a: 'No. Parkday helps you estimate, budget, and plan your trip. Tickets, resorts, dining reservations, and other bookings are still made directly through Disney or your preferred travel provider.',
  },
  {
    q: 'Is Parkday affiliated with Disney?',
    a: 'No. Parkday is an independent planning tool built for Walt Disney World visitors and is not affiliated with, endorsed by, or sponsored by The Walt Disney Company.',
  },
]

function NavBrand() {
  return (
    <div className={styles.navBrand}>
      <img src="/assets/logos/parkday-icon.svg" alt="Parkday" />
      <span>Parkday</span>
    </div>
  )
}

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)

  const [whyRef, whyInView] = useRevealOnScroll()
  const [hiwRef, hiwInView] = useRevealOnScroll()
  const [valuePropsRef, valuePropsInView] = useRevealOnScroll()
  const [featuresRef, featuresInView] = useRevealOnScroll()
  const [estimatorRef, estimatorInView] = useRevealOnScroll()
  const [pricingRef, pricingInView] = useRevealOnScroll()
  const [faqRef, faqInView] = useRevealOnScroll()

  const reveal = inView => `${styles.reveal} ${inView ? styles.revealVisible : ''}`

  const navLinks = (
    <>
      <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
      <a href="#estimator" onClick={() => setMobileOpen(false)}>Estimator</a>
      <a href="#pricing" onClick={() => setMobileOpen(false)}>Pricing</a>
      <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
    </>
  )

  return (
    <div className={styles.page}>
      {/* NAV */}
      <div className={styles.nav}>
        <div className={styles.navInner}>
          <NavBrand />
          <div className={styles.navLinks}>{navLinks}</div>
          <div className={styles.navCtaGroup}>
            <Link to="/login" className={styles.navLogin}>Log in</Link>
            <a href="#estimator" className={`${styles.btn} ${styles.btnPrimary} ${styles.navCta}`}>Try the estimator</a>
          </div>
          <button type="button" className={styles.navToggle} aria-label="Toggle menu" onClick={() => setMobileOpen(o => !o)}>
            <i className={`ti ${mobileOpen ? 'ti-x' : 'ti-menu-2'}`} />
          </button>
        </div>
        {mobileOpen && (
          <div className={styles.navMobile}>
            {navLinks}
            <Link to="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
          </div>
        )}
      </div>

      {/* HERO */}
      <div className={`${styles.wrap} ${styles.hero}`}>
        <div>
          <h1 className={styles.display}>Know what your Disney trip could really cost.</h1>
          <p className={styles.lead}>Estimate your full trip budget, compare vacation scenarios, track gift cards, and organize your park days all in one planning workspace built for Walt Disney World trips.</p>
          <div className={styles.heroCtas}>
            <a href="#estimator" className={`${styles.btn} ${styles.btnPrimary}`}>Try the free estimator</a>
            <a href="#how-it-works" className={`${styles.btn} ${styles.btnSecondary}`}>How it works</a>
          </div>
          <div className={styles.heroTrust}>
            <div className={styles.trustItem}><i className="ti ti-user-off" />No account needed to estimate</div>
            <div className={styles.trustItem}><i className="ti ti-gift" />Free to start</div>
          </div>
        </div>
        <div className={styles.heroPhoto}>
          <img src="/assets/img/hero-planner-screenshot.png" alt="Parkday trip dashboard showing budget overview and itinerary" />
        </div>
      </div>

      {/* WHY PARKDAY */}
      <div ref={whyRef} className={`${styles.dark} ${styles.why} ${reveal(whyInView)}`}>
        <div className={`${styles.wrap} ${styles.whyGrid}`}>
          <div>
            <h2 className={styles.display}>The money side of Disney planning lives everywhere.&nbsp;<br /><span className={styles.accent}>Until now.</span></h2>
            <p>Trip costs are spread across browser tabs, booking screens, gift card balances, reward accounts, reservation emails, and family notes. Parkday pulls those moving pieces into one clear plan so you can understand the cost before booking and keep adjusting as your trip gets closer.</p>
          </div>
          <div>
            <div className={styles.pillGrid}>
              {[
                ['ti-building-skyscraper', 'Resort'], ['ti-ticket', 'Tickets'], ['ti-tools-kitchen-2', 'Dining'],
                ['ti-bolt', 'Lightning Lane'], ['ti-bus', 'Transportation'], ['ti-shopping-bag', 'Souvenirs'],
                ['ti-credit-card', 'Gift cards'], ['ti-gift', 'Rewards'], ['ti-calendar-due', 'Due dates'],
              ].map(([icon, label]) => (
                <span key={label} className={styles.pill}><i className={`ti ${icon}`} />{label}</span>
              ))}
            </div>
            <div className={styles.whyArrow}><i className="ti ti-arrow-narrow-down" /></div>
            <div className={styles.tripCard}>
              <div className={styles.tripCardTop}>
                <div className={styles.tripCardBrand}>
                  <img src="/assets/logos/parkday-icon.svg" alt="" />
                  <span>Parkday</span>
                </div>
                <div className={styles.tripCardBadge}><i className="ti ti-users" /><span>Family Trip<br />May 24 – May 31</span></div>
              </div>
              <div className={styles.tripStats}>
                <div><div className={styles.tripStatLbl}>Planned</div><div className={styles.tripStatVal}>$5,420</div></div>
                <div><div className={styles.tripStatLbl}>Spent</div><div className={styles.tripStatVal}>$1,860</div></div>
                <div><div className={styles.tripStatLbl}>Remaining</div><div className={styles.tripStatVal} style={{ color: 'var(--gold)' }}>$3,560</div></div>
              </div>
              <div className={styles.tripBar}><div className={styles.tripBarFill} /></div>
              <div className={styles.tripBarLbl}>34% of budget spent</div>
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div ref={hiwRef} className={`${styles.wrap} ${styles.hiw} ${reveal(hiwInView)}`} id="how-it-works">
        <div className={styles.sectionHead}>
          <h2 className={styles.display}>How Parkday works</h2>
          <p>From your first estimate to your final park day, Parkday helps you keep the trip budget clear and organized.</p>
        </div>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepIcon} style={{ background: 'var(--cream-light)' }}>
              <i className="ti ti-calculator" style={{ color: 'var(--gold-dark)' }} />
              <div className={styles.stepNum} style={{ background: 'var(--gold)', color: '#3d2900' }}>01</div>
            </div>
            <div className={styles.stepTitle}>Estimate before booking</div>
            <div className={styles.stepBody}>Start with your dates, party size, resort style, tickets, dining approach, and extras. Parkday gives you a realistic planning range before you commit to the trip.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <i className="ti ti-clipboard-list" style={{ color: 'var(--sky)' }} />
              <div className={styles.stepNum} style={{ background: 'var(--sky)' }}>02</div>
            </div>
            <div className={styles.stepTitle}>Plan before traveling</div>
            <div className={styles.stepBody}>Turn your estimate into a real trip plan. Save your budget, organize park days, prepare checklists, and decide how gift cards or rewards will be used.</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <i className="ti ti-chart-bar" style={{ color: 'var(--teal)' }} />
              <div className={styles.stepNum} style={{ background: 'var(--teal)' }}>03</div>
            </div>
            <div className={styles.stepTitle}>Track while spending</div>
            <div className={styles.stepBody}>Log actual expenses as you book, travel, and spend in the parks. Compare planned vs. actual costs and see what remains in your budget.</div>
          </div>
        </div>
        <div className={styles.hiwCta}>
          <a href="#estimator" className={`${styles.btn} ${styles.btnPrimary}`}>Try the free estimator</a>
        </div>
      </div>

      {/* VALUE PROPS */}
      <div ref={valuePropsRef} className={`${styles.wrap} ${styles.valueProps} ${reveal(valuePropsInView)}`}>
        <div className={styles.valueGrid}>
          <div className={styles.valueCard} style={{ background: 'var(--sky-bg)' }}>
            <div className={styles.valueIcon} style={{ background: 'var(--sky)' }}><i className="ti ti-users" /></div>
            <div><div className={styles.valueTitle} style={{ color: 'var(--sky-dark)' }}>Made by Disney travelers</div><div className={styles.valueSub}>We get it, we plan too.</div></div>
          </div>
          <div className={styles.valueCard} style={{ background: 'var(--gold-bg)' }}>
            <div className={styles.valueIcon} style={{ background: 'var(--gold)', color: '#3d2900' }}><i className="ti ti-clock" /></div>
            <div><div className={styles.valueTitle} style={{ color: '#8a5a00' }}>Plan at your pace</div><div className={styles.valueSub}>Start free, cancel anytime.</div></div>
          </div>
          <div className={styles.valueCard} style={{ background: 'var(--teal-bg)' }}>
            <div className={styles.valueIcon} style={{ background: 'var(--teal)' }}><i className="ti ti-shield-lock" /></div>
            <div><div className={styles.valueTitle} style={{ color: 'var(--teal-dark)' }}>Your data is private</div><div className={styles.valueSub}>We'll never sell your data.</div></div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div ref={featuresRef} className={`${styles.wrap} ${styles.features} ${reveal(featuresInView)}`} id="features">
        <div className={styles.sectionHead}>
          <h2 className={styles.display}>Everything you need to plan with confidence.</h2>
          <p>From the first estimate to the final countdown, Parkday keeps every part of your trip organized.</p>
        </div>

        <div className={styles.bigFeatures}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: 'var(--sky-bg)' }}><i className="ti ti-calculator" style={{ color: 'var(--sky-dark)' }} /></div>
            <div className={styles.featureTitle}>Estimate your total trip cost</div>
            <div className={styles.featureBody}>Get a realistic low-to-high estimate based on your family size, trip length, resort style, tickets, dining, and extras.</div>
            <div className={styles.featureViz}>
              <div className={styles.fvBar}>
                <span style={{ width: '42%', background: 'var(--sky-dark)' }} />
                <span style={{ width: '26%', background: 'var(--sky-dark)', opacity: 0.7 }} />
                <span style={{ width: '20%', background: 'var(--sky-dark)', opacity: 0.45 }} />
                <span style={{ width: '12%', background: 'var(--sky-dark)', opacity: 0.2 }} />
              </div>
              <div className={styles.fvLegend}>
                <div className={styles.fvLegendItem}><span className={styles.fvDot} style={{ background: 'var(--sky-dark)' }} />Resort <span style={{ fontWeight: 600, color: 'var(--sky-dark)', marginLeft: 'auto' }}>$2.2k</span></div>
                <div className={styles.fvLegendItem}><span className={styles.fvDot} style={{ background: 'var(--sky-dark)', opacity: 0.7 }} />Tickets <span style={{ fontWeight: 600, color: 'var(--sky-dark)', marginLeft: 'auto' }}>$1.3k</span></div>
                <div className={styles.fvLegendItem}><span className={styles.fvDot} style={{ background: 'var(--sky-dark)', opacity: 0.45 }} />Dining <span style={{ fontWeight: 600, color: 'var(--sky-dark)', marginLeft: 'auto' }}>$1.0k</span></div>
                <div className={styles.fvLegendItem}><span className={styles.fvDot} style={{ background: 'var(--sky-dark)', opacity: 0.2 }} />Extras <span style={{ fontWeight: 600, color: 'var(--sky-dark)', marginLeft: 'auto' }}>$0.6k</span></div>
              </div>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: 'var(--gold-bg)' }}><i className="ti ti-arrows-shuffle" style={{ color: '#8a5a00' }} /></div>
            <div className={styles.featureTitle}>Compare trip scenarios</div>
            <div className={styles.featureBody}>Test different versions of your vacation before you book, from value-focused trips to bigger splurge options.</div>
            <div className={`${styles.featureViz} ${styles.fvCompare}`}>
              <div className={styles.fvCompareItem} style={{ background: '#8a5a00', opacity: 0.3 }}><div className={styles.amt}>$3.4k</div><div className={styles.lbl}>Value</div></div>
              <div className={styles.fvCompareItem} style={{ background: '#8a5a00' }}><div className={styles.amt}>$5.2k</div><div className={styles.lbl} style={{ fontWeight: 600 }}>Moderate</div></div>
              <div className={styles.fvCompareItem} style={{ background: '#8a5a00', opacity: 0.55 }}><div className={styles.amt}>$7.6k</div><div className={styles.lbl}>Splurge</div></div>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: 'var(--teal-bg)' }}><i className="ti ti-chart-bar" style={{ color: 'var(--teal-dark)' }} /></div>
            <div className={styles.featureTitle}>Expense tracking</div>
            <div className={styles.featureBody}>Log trip expenses as you book and spend, then compare planned costs, actual spending, and remaining budget by category.</div>
            <div className={styles.featureViz}>
              <div className={styles.fvTrackerTop}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal-dark)' }}>Actual $3.8k</span>
                <span style={{ fontSize: 10, color: 'var(--teal-dark)', opacity: 0.7 }}>Planned <b style={{ opacity: 1 }}>$5.2k</b></span>
              </div>
              <div className={styles.fvTrackerTrack}><div className={styles.fvTrackerFill} /></div>
              <div className={styles.fvTrackerNote}>$1.4k under planned</div>
            </div>
          </div>
        </div>

        <div className={styles.smallFeatures}>
          {[
            ['ti-chart-pie', 'var(--sky-bg)', 'var(--sky-dark)', 'Budget breakdown'],
            ['ti-device-floppy', 'var(--coral-bg)', 'var(--coral)', 'Saved plans'],
            ['ti-calendar', 'var(--sky-bg)', 'var(--sky-dark)', 'Park-day planning'],
            ['ti-checklist', 'var(--teal-bg)', 'var(--teal-dark)', 'Checklists'],
            ['ti-credit-card', 'var(--gold-bg)', '#8a5a00', 'Gift card tracking'],
            ['ti-users', 'var(--coral-bg)', 'var(--coral)', 'Family Travel Profile'],
          ].map(([icon, bg, color, label]) => (
            <div className={styles.smallFeature} key={label}>
              <div className={styles.smallFeatureIcon} style={{ background: bg }}><i className={`ti ${icon}`} style={{ color }} /></div>
              <div className={styles.smallFeatureTitle}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ESTIMATOR */}
      <div ref={estimatorRef} className={`${styles.wrap} ${styles.estimatorSection} ${reveal(estimatorInView)}`} id="estimator">
        <div className={styles.sectionHead}>
          <h2 className={styles.display}>Wonder what your trip will really cost?</h2>
          <p>Answer a few questions about your party, resort, and park days and get a realistic budget in under two minutes. No account needed.</p>
        </div>
        <Estimator />
      </div>

      {/* PRICING */}
      <div ref={pricingRef} className={`${styles.dark} ${styles.pricing} ${reveal(pricingInView)}`} id="pricing">
        <div className={styles.wrap}>
          <div className={styles.pricingHead}>
            <h2 className={styles.display}>Choose the plan that fits your trip</h2>
            <p>Start for free. Upgrade when you're ready to plan more.</p>
          </div>
          <div className={styles.pricingGrid}>
            <div className={`${styles.plan} ${styles.planStarter}`}>
              <div className={styles.planBody}>
                <div className={styles.planBadge} style={{ background: 'var(--teal)', color: '#fff' }}>Free</div>
                <div className={styles.planName} style={{ color: 'var(--teal-dark)' }}>Parkday Starter</div>
                <div className={styles.planPrice}>$0</div>
                <div className={styles.planSub}>Get a realistic starting budget for free.</div>
                <div className={styles.planFeatures}>
                  {['Free trip cost estimator', 'Basic trip summary', 'Starter budget breakdown', 'No account required'].map(f => (
                    <div className={styles.planFeature} key={f}><i className="ti ti-check" style={{ color: 'var(--teal)' }} /><span>{f}</span></div>
                  ))}
                </div>
                <a href="#estimator" className={`${styles.btn} ${styles.btnOutlineTeal} ${styles.btnBlock}`}>Try the free estimator</a>
              </div>
            </div>

            <div className={`${styles.plan} ${styles.planPass}`}>
              <div className={styles.planBody}>
                <div className={styles.planBadge} style={{ background: 'var(--gold)', color: '#3d2900' }}>Most popular</div>
                <div className={styles.planName} style={{ color: 'var(--gold-dark)' }}>Parkday Trip Pass</div>
                <div className={styles.planPrice}>$29 <span className={styles.period}>/trip</span></div>
                <div className={styles.planSub}>Unlock planning tools for one Disney vacation.</div>
                <div className={styles.planFeatures}>
                  {['Full budget planner', 'Scenario comparison', 'Budget Tracker', 'Gift Card Manager', 'Park-day planner', 'Planning checklists', 'Payment and deadline tracking', 'Share/export trip plan', 'Access through 30 days after your trip'].map(f => (
                    <div className={styles.planFeature} key={f}><i className="ti ti-check" style={{ color: 'var(--gold-dark)' }} /><span>{f}</span></div>
                  ))}
                </div>
                <Link to="/login" className={`${styles.btn} ${styles.btnGold} ${styles.btnBlock}`}>Unlock one trip</Link>
              </div>
            </div>

            <div className={`${styles.plan} ${styles.planPlus}`}>
              <div className={styles.planBody}>
                <div className={styles.planBadge} style={{ background: 'var(--sky)', color: '#fff' }}>Best value</div>
                <div className={styles.planName} style={{ color: 'var(--sky-dark)' }}>Parkday Plus</div>
                <div className={styles.planPrice}>$59<span className={styles.period}>/year</span></div>
                <div className={styles.planSub}>For families planning more than one Disney trip.</div>
                <div className={styles.planFeatures}>
                  {['Unlimited trips', 'All Single Pass features', 'Compare multiple vacations', 'Family Travel Profile', 'Reusable trip preferences', 'Early access to new planning tools'].map(f => (
                    <div className={styles.planFeature} key={f}><i className="ti ti-check" style={{ color: 'var(--sky)' }} /><span>{f}</span></div>
                  ))}
                </div>
                <Link to="/login" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}>Start Parkday Plus</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div ref={faqRef} className={`${styles.faq} ${reveal(faqInView)}`} id="faq">
        <div className={styles.faqHead}>
          <div className={styles.faqEyebrow}>FAQ</div>
          <h2 className={styles.display}>Questions, answered.</h2>
        </div>
        {FAQS.map((item, i) => (
          <div className={`${styles.faqItem} ${openFaq === i ? styles.open : ''}`} key={item.q}>
            <button type="button" className={styles.faqQ} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
              <span>{item.q}</span>
              <i className={`ti ${openFaq === i ? 'ti-minus' : 'ti-plus'}`} />
            </button>
            <div className={styles.faqA}><div className={styles.faqAInner}>{item.a}</div></div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <div className={styles.footerBrandMark}>
                <img src="/assets/logos/parkday-icon.svg" alt="" />
                <span>Parkday</span>
              </div>
              <p>Trip planning for Walt Disney World families — budgets, itineraries, and checklists in one place.</p>
            </div>
            <div>
              <div className={styles.footerColTitle}>Product</div>
              <div className={styles.footerLinks}>
                <a href="#features">Features</a>
                <a href="#estimator">Estimator</a>
                <a href="#pricing">Pricing</a>
              </div>
            </div>
            <div>
              <div className={styles.footerColTitle}>Company</div>
              <div className={styles.footerLinks}>
                <a href="#">About</a>
                <a href="#faq">FAQ</a>
                <a href="#">Contact</a>
              </div>
            </div>
            <div>
              <div className={styles.footerColTitle}>Legal</div>
              <div className={styles.footerLinks}>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>© 2026 Parkday. Not affiliated with the Walt Disney Company.</div>
        </div>
      </div>
    </div>
  )
}
