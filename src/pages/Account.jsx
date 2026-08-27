import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getFullProfile, updateProfile, deleteAccount } from '../lib/profile'
import { fetchArchivedTrips, unarchiveTrip } from '../lib/trips'
import { familyMemberAge, familyMemberBirthdateLabel } from '../lib/familyMembers'
import { createPortalSession, fetchPaymentMethod } from '../lib/stripe'
import { signOutAndRedirect, sendPasswordReset } from '../lib/auth'
import {
  fetchCollaboratorInvite, fetchCollaborator, sendCollaboratorInvite, resendCollaboratorInvite,
  cancelCollaboratorInvite, removeCollaborator, leaveCollaboratorAccount,
} from '../lib/collaborator'
import styles from './Account.module.css'

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
]

const PLAN_LABEL = { trip_pass: 'Trip Pass', plus_pass: 'Parkday Plus' }

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDate(str) {
  return parseLocalDate(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateRange(trip) {
  if (!trip.arrival_date || !trip.departure_date) return ''
  if (trip.arrival_date === trip.departure_date) return fmtDate(trip.arrival_date)
  return `${fmtDate(trip.arrival_date)} – ${fmtDate(trip.departure_date)}`
}

// Trip Pass unlocks planning for a single trip through 30 days after it ends.
function passExpiryDate(trip) {
  if (!trip?.departure_date) return null
  const d = parseLocalDate(trip.departure_date)
  d.setDate(d.getDate() + 30)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Plus Pass bills annually — the next renewal is the next yearly anniversary
// of signup, computed locally since Stripe subscription details aren't
// fetched into the app yet. Anniversary math and display both stay in UTC
// calendar terms so the date doesn't shift a day depending on the viewer's
// timezone (created_at is a UTC timestamp near midnight).
function nextRenewalDate(createdAt) {
  if (!createdAt) return null
  const signup = new Date(createdAt)
  const now = new Date()
  const month = signup.getUTCMonth()
  const day = signup.getUTCDate()
  let next = new Date(Date.UTC(now.getUTCFullYear(), month, day))
  if (next <= now) next = new Date(Date.UTC(now.getUTCFullYear() + 1, month, day))
  return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function Card({ icon, iconBg, iconColor, title, sub, children }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHdr}>
        <div className={styles.cardHdrL}>
          <div className={styles.cardIcon} style={iconBg ? { background: iconBg } : undefined}>
            <i className={`ti ${icon}`} style={iconColor ? { color: iconColor } : undefined} />
          </div>
          <div>
            <div className={styles.cardTitle}>{title}</div>
            {sub && <div className={styles.cardSub}>{sub}</div>}
          </div>
        </div>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  )
}

function ToggleRow({ name, sub, on, onToggle }) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleLeft}>
        <div className={styles.toggleName}>{name}</div>
        <div className={styles.toggleSub}>{sub}</div>
      </div>
      <button type="button" className={`${styles.toggle} ${on ? styles.on : ''}`} onClick={onToggle} />
    </div>
  )
}

export default function Account() {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const { session, showToast, activeTrip, familyMembers, openFamilySheet, refetchTrips } = outletContext ?? {}
  const userId = session?.user?.id

  const [profile, setProfile] = useState(null)
  const [nameDraft, setNameDraft] = useState('')
  const [tzDraft, setTzDraft] = useState('America/New_York')
  const [saving, setSaving] = useState(false)
  const [archivedTrips, setArchivedTrips] = useState(null)
  const [unarchivingId, setUnarchivingId] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState(undefined) // undefined = not fetched yet, null = none on file
  const [collaboratorState, setCollaboratorState] = useState(undefined) // undefined = loading, else {type:'none'|'pending'|'active', ...}
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getFullProfile(userId).then(({ data }) => {
      if (cancelled) return
      const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || ''
      setProfile(data ?? {})
      setNameDraft(data?.full_name || googleName)
      setTzDraft(data?.timezone || 'America/New_York')
    })
    fetchArchivedTrips().then(({ data }) => { if (!cancelled) setArchivedTrips(data) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function loadCollaboratorState() {
    const { data: collaborator } = await fetchCollaborator(userId)
    if (collaborator) { setCollaboratorState({ type: 'active', collaborator }); return }
    const { data: invite } = await fetchCollaboratorInvite(userId)
    if (invite) { setCollaboratorState({ type: 'pending', invite }); return }
    setCollaboratorState({ type: 'none' })
  }

  useEffect(() => {
    if (!userId || profile?.account_type !== 'owner') return
    loadCollaboratorState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile?.account_type])

  useEffect(() => {
    if (!profile?.stripe_customer_id) return
    let cancelled = false
    fetchPaymentMethod(profile.stripe_customer_id).then(({ data, error }) => {
      if (cancelled) return
      setPaymentMethod(error ? null : (data?.paymentMethod ?? null))
    })
    return () => { cancelled = true }
  }, [profile?.stripe_customer_id])

  if (!session || profile === null) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} />
        <div className={styles.skelBlock} />
        <div className={styles.skelBlock} />
      </div>
    )
  }

  async function handleSaveProfile() {
    setSaving(true)
    const { data, error } = await updateProfile(userId, { full_name: nameDraft.trim(), timezone: tzDraft })
    setSaving(false)
    if (error) { showToast?.(error.message); return }
    setProfile(p => ({ ...p, ...data }))
    showToast?.('Profile updated')
  }

  async function handleResetPassword() {
    const { error } = await sendPasswordReset(session.user.email)
    showToast?.(error ? error.message : 'Password reset email sent.')
  }

  async function toggleNotif(field) {
    const next = !profile[field]
    setProfile(p => ({ ...p, [field]: next }))
    const { error } = await updateProfile(userId, { [field]: next })
    if (error) {
      setProfile(p => ({ ...p, [field]: !next }))
      showToast?.(error.message)
      return
    }
    showToast?.(next ? 'Turned on' : 'Turned off')
  }

  async function handleUnarchive(trip) {
    setUnarchivingId(trip.id)
    const { error } = await unarchiveTrip(trip.id)
    setUnarchivingId(null)
    if (error) { showToast?.(error.message); return }
    showToast?.('Trip unarchived')
    setArchivedTrips(prev => (prev ?? []).filter(t => t.id !== trip.id))
    refetchTrips?.()
  }

  async function handleManageSubscription() {
    if (!profile.stripe_customer_id) { showToast?.('No billing account on file.'); return }
    setPortalLoading(true)
    const { data, error } = await createPortalSession(profile.stripe_customer_id)
    setPortalLoading(false)
    if (error || !data?.url) { showToast?.(error?.message ?? 'Could not open billing portal.'); return }
    window.location.href = data.url
  }

  async function handleDeleteAccount() {
    const ok = window.confirm('Are you sure? This cannot be undone.')
    if (!ok) return
    setDeleting(true)
    const { error } = await deleteAccount()
    if (error) {
      setDeleting(false)
      showToast?.(error.message)
      return
    }
    await signOutAndRedirect()
  }

  async function handleSendInvite() {
    setInviteError(null)
    setInviteLoading(true)
    const { error } = await sendCollaboratorInvite(inviteEmail.trim())
    setInviteLoading(false)
    if (error) { setInviteError(error.message); return }
    setInviteEmail('')
    showToast?.('Invite sent')
    loadCollaboratorState()
  }

  async function handleResendInvite() {
    const { error } = await resendCollaboratorInvite()
    showToast?.(error ? error.message : 'Invite resent')
  }

  async function handleCancelInvite() {
    const { error } = await cancelCollaboratorInvite(collaboratorState.invite.id)
    if (error) { showToast?.(error.message); return }
    showToast?.('Invite canceled')
    loadCollaboratorState()
  }

  async function handleRemoveCollaborator() {
    const who = collaboratorState.collaborator.full_name || collaboratorState.collaborator.email
    const ok = window.confirm(`Are you sure? ${who} will immediately lose access to your trips.`)
    if (!ok) return
    const { error } = await removeCollaborator(collaboratorState.collaborator.id)
    if (error) { showToast?.(error.message); return }
    showToast?.('Collaborator removed')
    loadCollaboratorState()
  }

  async function handleLeaveAccount() {
    const ok = window.confirm('Are you sure? You will lose access to their trips immediately.')
    if (!ok) return
    setLeaving(true)
    const { error } = await leaveCollaboratorAccount(userId)
    setLeaving(false)
    if (error) { showToast?.(error.message); return }
    window.location.href = '/'
  }

  const providers = session.user.app_metadata?.providers || []
  const isGoogleOnly = providers.includes('google') && !providers.includes('email')
  const isCollaborator = profile.account_type === 'collaborator'

  const isPlus = profile.plan_type === 'plus_pass' && profile.subscription_status === 'active'
  const isTripPass = profile.plan_type === 'trip_pass' && profile.subscription_status === 'active'
  const isInactive = profile.subscription_status !== 'active'

  return (
    <div className={styles.list}>
      <Card icon="ti-user" title="Personal info">
        <div className={styles.row}>
          <div className={styles.lbl}>Name</div>
          <input className={styles.textInp} type="text" value={nameDraft} onChange={e => setNameDraft(e.target.value)} placeholder="Your name" />
        </div>
        <div className={styles.row}>
          <div className={styles.lbl}>Timezone</div>
          <select className={styles.textInp} value={tzDraft} onChange={e => setTzDraft(e.target.value)}>
            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
        </div>
        <div className={styles.rowInline}>
          <div><div className={styles.lbl}>Email</div><div className={styles.val}>{session.user.email}</div></div>
          {!isGoogleOnly && (
            <button type="button" className={styles.linkBtn} onClick={() => showToast?.("Email changes aren't supported yet.")}>Change</button>
          )}
        </div>
        {isGoogleOnly ? (
          <div className={styles.rowInline}>
            <div><div className={styles.lbl}>Sign-in method</div><div className={styles.val}><i className="ti ti-brand-google" /> Google account</div></div>
          </div>
        ) : (
          <div className={styles.rowInline}>
            <div><div className={styles.lbl}>Password</div><div className={styles.val}>••••••••</div></div>
            <button type="button" className={styles.linkBtn} onClick={handleResetPassword}>Reset</button>
          </div>
        )}
        <button type="button" className={styles.addBtn} disabled={saving} onClick={handleSaveProfile}>
          <i className="ti ti-check" /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </Card>

      <Card icon="ti-users" iconBg="rgba(224,83,63,0.12)" iconColor="var(--coral)" title="Family members">
        {familyMembers === null ? (
          <div className={styles.empty}>Loading…</div>
        ) : familyMembers.length === 0 ? (
          <div className={styles.famEmptyState}>
            <i className="ti ti-users" />
            <div className={styles.famEmptyTitle}>No family members yet</div>
            <div className={styles.famEmptySub}>Add your family once and reuse them on every trip you plan.</div>
          </div>
        ) : (
          familyMembers.map(m => {
            const age = familyMemberAge(m.birthdate)
            return (
              <div key={m.id} className={styles.famRow}>
                <div className={styles.famAvatar}>{m.name.charAt(0)}</div>
                <div className={styles.famInfo}>
                  <div className={styles.famName}>
                    {m.name}
                    {m.annual_pass && <span className={styles.famApPill}>AP</span>}
                  </div>
                  <div className={styles.famSub}>
                    {m.birthdate ? `${familyMemberBirthdateLabel(m.birthdate)} · Age ${age}` : 'No birthdate set'}
                  </div>
                </div>
                <button type="button" className={styles.famEditBtn} title="Edit" onClick={() => openFamilySheet?.({ editingMember: m })}>
                  <i className="ti ti-pencil" />
                </button>
              </div>
            )
          })
        )}
        <button type="button" className={styles.addBtn} onClick={() => openFamilySheet?.({})}>
          <i className="ti ti-plus" /> Add family member
        </button>
      </Card>

      {!isCollaborator && (
        <Card icon="ti-users-group" iconBg="rgba(44,165,141,0.16)" iconColor="var(--teal-dark)" title="Collaborator" sub="One free seat on your account">
          {collaboratorState === undefined ? (
            <div className={styles.empty}>Loading…</div>
          ) : collaboratorState.type === 'active' ? (
            <>
              <div className={styles.rowInline}>
                <div>
                  <div className={styles.val}>{collaboratorState.collaborator.full_name || collaboratorState.collaborator.email}</div>
                  {collaboratorState.collaborator.full_name && <div className={styles.sub}>{collaboratorState.collaborator.email}</div>}
                </div>
                <span className={`${styles.planBadge} ${styles.badgePlus}`}>Active</span>
              </div>
              <button type="button" className={`${styles.dangerBtn} ${styles.solid}`} style={{ marginTop: 10 }} onClick={handleRemoveCollaborator}>
                Remove collaborator
              </button>
            </>
          ) : collaboratorState.type === 'pending' ? (
            <>
              <div className={styles.rowInline}>
                <div><div className={styles.val}>{collaboratorState.invite.invited_email}</div></div>
                <span className={`${styles.planBadge} ${styles.badgeTrip}`}>Pending</span>
              </div>
              <div className={styles.rowInline}>
                <button type="button" className={styles.linkBtn} onClick={handleResendInvite}>Resend invite</button>
                <button type="button" className={styles.linkBtn} onClick={handleCancelInvite}>Cancel invite</button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.row}>
                <div className={styles.lbl}>Invite someone to your account</div>
                <input
                  className={styles.textInp}
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="their@email.com"
                />
              </div>
              {inviteError && <div className={styles.dangerSub} style={{ color: 'var(--coral)' }}>{inviteError}</div>}
              <button type="button" className={styles.addBtn} disabled={inviteLoading || !inviteEmail.trim()} onClick={handleSendInvite}>
                <i className="ti ti-send" /> {inviteLoading ? 'Sending…' : 'Send invite'}
              </button>
              <div className={styles.planNote}>Your collaborator can view and edit all your trips. They'll need to create a free Parkday account to accept.</div>
            </>
          )}
        </Card>
      )}

      {!isCollaborator && (
      <>
      <Card icon="ti-sparkles" iconBg="rgba(245,181,54,0.18)" iconColor="#8a5a00" title="Subscription">
        {isInactive ? (
          <>
            <div className={styles.planRow}>
              <span className={`${styles.planBadge} ${styles.badgeInactive}`}>Inactive</span>
            </div>
            <button type="button" className={styles.addBtn} onClick={() => navigate('/paywall')}>
              <i className="ti ti-arrow-up" /> Reactivate
            </button>
          </>
        ) : isPlus ? (
          <>
            <div className={styles.planRow}>
              <span className={`${styles.planBadge} ${styles.badgePlus}`}><i className="ti ti-crown" /> Parkday Plus</span>
              <button type="button" className={styles.linkBtn} disabled={portalLoading} onClick={handleManageSubscription}>
                {portalLoading ? 'Opening…' : 'Manage'}
              </button>
            </div>
            <div className={styles.rowInline}>
              <div><div className={styles.lbl}>Renews</div><div className={styles.val}>{nextRenewalDate(profile.created_at) ? `${nextRenewalDate(profile.created_at)} · $59.99/year` : '—'}</div></div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.planRow}>
              <span className={`${styles.planBadge} ${styles.badgeTrip}`}><i className="ti ti-ticket" /> {PLAN_LABEL[profile.plan_type] || 'Trip Pass'}</span>
            </div>
            {passExpiryDate(activeTrip) && (
              <div className={styles.rowInline}>
                <div><div className={styles.lbl}>Expires</div><div className={styles.val}>{passExpiryDate(activeTrip)}</div></div>
              </div>
            )}
            <button type="button" className={styles.addBtn} onClick={() => navigate('/paywall')}>
              <i className="ti ti-arrow-up" /> Upgrade to Plus
            </button>
            <div className={styles.planNote}>Upgrade to Plus Pass to plan unlimited trips and reuse past trips as templates.</div>
          </>
        )}
      </Card>

      <Card icon="ti-archive" iconBg="rgba(13,35,64,0.08)" iconColor="var(--night)" title="Trip archive" sub="Past trips you've set aside">
        {archivedTrips === null ? (
          <div className={styles.empty}>Loading…</div>
        ) : archivedTrips.length === 0 ? (
          <div className={styles.empty}>No archived trips yet.</div>
        ) : (
          archivedTrips.map(t => (
            <div key={t.id} className={styles.rowInline}>
              <div>
                <div className={styles.val}>{t.name}</div>
                <div className={styles.sub}>{fmtDateRange(t)}{t.accommodation ? ` · ${t.accommodation}` : ''}</div>
              </div>
              <div className={styles.rowInlineActions}>
                <button type="button" className={styles.linkBtn} disabled={unarchivingId === t.id} onClick={() => handleUnarchive(t)}>
                  {unarchivingId === t.id ? 'Unarchiving…' : 'Unarchive'}
                </button>
                <button type="button" className={styles.linkBtn} onClick={() => showToast?.('Trip archive view coming soon.')}>View</button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Card icon="ti-credit-card" iconBg="rgba(42,111,224,0.12)" iconColor="var(--sky-dark)" title="Payment method">
        {paymentMethod === undefined && profile.stripe_customer_id ? (
          <div className={styles.rowInline}>
            <div className={styles.val}>Loading…</div>
          </div>
        ) : paymentMethod ? (
          <div className={styles.pmRow}>
            <div className={styles.cardBrand}>{paymentMethod.brand}</div>
            <div className={styles.pmInfo}>
              <div className={styles.pmNum}>•••• {paymentMethod.last4}</div>
              <div className={styles.pmExp}>Expires {String(paymentMethod.expMonth).padStart(2, '0')}/{String(paymentMethod.expYear).slice(-2)}</div>
            </div>
            <button type="button" className={styles.linkBtn} disabled={portalLoading} onClick={handleManageSubscription}>Update</button>
          </div>
        ) : (
          <div className={styles.rowInline}>
            <div className={styles.val}>No payment method on file.</div>
            <button type="button" className={styles.linkBtn} disabled={portalLoading} onClick={handleManageSubscription}>Update</button>
          </div>
        )}
      </Card>
      </>
      )}

      <Card icon="ti-bell" iconBg="rgba(44,165,141,0.16)" iconColor="var(--teal-dark)" title="Notifications">
        <ToggleRow name="Booking deadlines" sub="ADR windows, ticket & resort payment due dates" on={!!profile.notif_deadlines} onToggle={() => toggleNotif('notif_deadlines')} />
        <ToggleRow name="Check-in reminders" sub="Online check-in & Lightning Lane booking windows" on={!!profile.notif_checkin} onToggle={() => toggleNotif('notif_checkin')} />
        <ToggleRow name="Budget alerts" sub="When a category goes over its planned budget" on={!!profile.notif_budget} onToggle={() => toggleNotif('notif_budget')} />
      </Card>

      <Card icon="ti-mail" iconBg="rgba(13,35,64,0.07)" iconColor="var(--night)" title="Email preferences">
        <ToggleRow name="Tips, offers & product news" sub="Occasional planning tips and Parkday updates — not booking reminders" on={!!profile.notif_marketing} onToggle={() => toggleNotif('notif_marketing')} />
      </Card>

      <div className={styles.dangerCard}>
        <div className={styles.dangerHdr}>
          <i className="ti ti-alert-triangle" />
          <div className={styles.dangerTitle}>Danger zone</div>
        </div>
        <div className={styles.dangerBody}>
          {isCollaborator && (
            <div className={styles.dangerRow}>
              <div>
                <div className={styles.dangerName}>Leave this account</div>
                <div className={styles.dangerSub}>Remove your collaborator link — you'll lose access to their trips</div>
              </div>
              <button type="button" className={`${styles.dangerBtn} ${styles.solid}`} disabled={leaving} onClick={handleLeaveAccount}>
                {leaving ? 'Leaving…' : 'Leave'}
              </button>
            </div>
          )}
          <div className={styles.dangerRow}>
            <div>
              <div className={styles.dangerName}>Export my data</div>
              <div className={styles.dangerSub}>Download everything Parkday has on your account &amp; trips</div>
            </div>
            <button type="button" className={styles.dangerBtn} onClick={() => showToast?.('Data export coming soon.')}>Export</button>
          </div>
          <div className={styles.dangerRow}>
            <div>
              <div className={styles.dangerName}>Delete account</div>
              <div className={styles.dangerSub}>Permanently deletes your account, trips, and saved data</div>
            </div>
            <button type="button" className={`${styles.dangerBtn} ${styles.solid}`} disabled={deleting} onClick={handleDeleteAccount}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
