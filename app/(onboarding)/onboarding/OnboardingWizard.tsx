'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Form,
  Stack,
  TextInput,
  Select,
  SelectItem,
  Tile,
  InlineNotification,
  Tag,
  Checkbox,
} from '@carbon/react'
import { ArrowRight, Checkmark, CheckmarkFilled, Add, TrashCan } from '@carbon/icons-react'
import {
  onboardingCreateSite,
  onboardingCreateDepartment,
  onboardingInviteUsers,
  onboardingLoadStarterPack,
  onboardingComplete,
} from '@/app/actions/onboarding'

const SITE_TYPES = [
  { value: 'office', label: 'Office' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'construction_site', label: 'Construction Site' },
  { value: 'mine', label: 'Mine / Quarry' },
  { value: 'factory', label: 'Factory / Plant' },
  { value: 'healthcare_facility', label: 'Healthcare Facility' },
  { value: 'depot', label: 'Depot / Yard' },
  { value: 'farm', label: 'Farm / Agricultural Site' },
  { value: 'other', label: 'Other' },
]

type Step = 1 | 2 | 3 | 4 | 5

interface Role {
  id: string
  name: string
}

interface InviteRow {
  email: string
  roleId: string
}

function StepProgress({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Your first site' },
    { n: 2, label: 'Department' },
    { n: 3, label: 'Team' },
    { n: 4, label: 'Templates' },
    { n: 5, label: 'Done' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', overflowX: 'auto' }}>
      {steps.map((step, i) => {
        const done = step.n < current
        const active = step.n === current
        return (
          <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
              <div style={{
                width: '2rem', height: '2rem', borderRadius: '50%',
                backgroundColor: done ? '#24a148' : active ? '#0f62fe' : 'transparent',
                border: `2px solid ${done ? '#24a148' : active ? '#0f62fe' : '#c6c6c6'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done
                  ? <Checkmark size={14} style={{ color: '#fff' }} />
                  : <span style={{ fontSize: '0.75rem', fontWeight: 600, color: active ? '#fff' : '#6f6f6f' }}>{step.n}</span>
                }
              </div>
              <span style={{ fontSize: '0.6875rem', color: active ? '#0f62fe' : done ? '#24a148' : '#6f6f6f', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: '1px', backgroundColor: done ? '#24a148' : '#e0e0e0', margin: '0 0.5rem', marginBottom: '1.25rem' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function OnboardingWizard({ roles }: { roles: Role[] }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 — Site
  const [siteName, setSiteName] = useState('')
  const [siteType, setSiteType] = useState('')
  const [siteCity, setSiteCity] = useState('')
  const [siteState, setSiteState] = useState('')

  // Step 2 — Department
  const [deptName, setDeptName] = useState('')
  const [deptDesc, setDeptDesc] = useState('')

  // Step 3 — Invite
  const [invites, setInvites] = useState<InviteRow[]>([{ email: '', roleId: '' }])
  const [inviteSummary, setInviteSummary] = useState<string | null>(null)

  // Step 4 — Starter pack
  const [packLoaded, setPackLoaded] = useState(false)
  const [packCount, setPackCount] = useState(0)

  async function handleSiteSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!siteName.trim()) return setError('Site name is required.')
    setLoading(true)
    const result = await onboardingCreateSite({ name: siteName, siteType, city: siteCity, state: siteState })
    setLoading(false)
    if (result.error) return setError(result.error)
    setStep(2)
  }

  async function handleDeptSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (deptName.trim()) {
      setLoading(true)
      const result = await onboardingCreateDepartment({ name: deptName, description: deptDesc })
      setLoading(false)
      if (result.error) return setError(result.error)
    }
    setStep(3)
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const validInvites = invites.filter(i => i.email.trim())
    if (validInvites.length > 0) {
      setLoading(true)
      const result = await onboardingInviteUsers(validInvites.map(i => ({ email: i.email, roleId: i.roleId })))
      setLoading(false)
      if (result.errors.length > 0) return setError(result.errors.join('; '))
      setInviteSummary(`${result.sent} invitation${result.sent === 1 ? '' : 's'} sent`)
    }
    setStep(4)
  }

  async function handleLoadPack() {
    setError(null)
    setLoading(true)
    const result = await onboardingLoadStarterPack()
    setLoading(false)
    if (result.error) return setError(result.error)
    setPackLoaded(true)
    setPackCount(result.loaded)
  }

  async function handleFinish() {
    setLoading(true)
    await onboardingComplete()
    router.push('/dashboard')
    router.refresh()
  }

  function addInviteRow() {
    setInvites(prev => [...prev, { email: '', roleId: '' }])
  }
  function removeInviteRow(i: number) {
    setInvites(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateInvite(i: number, field: 'email' | 'roleId', value: string) {
    setInvites(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  return (
    <Tile style={{ padding: '2rem' }}>
      <StepProgress current={step} />

      {error && (
        <InlineNotification
          kind="error" title="Error" subtitle={error} lowContrast
          onCloseButtonClick={() => setError(null)}
          style={{ marginBottom: '1.5rem', maxWidth: '100%' }}
        />
      )}

      {/* ── Step 1: First site ─────────────────────────────────── */}
      {step === 1 && (
        <Form onSubmit={handleSiteSubmit}>
          <Stack gap={6}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#161616', marginBottom: '0.5rem' }}>
                Create your first site
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#525252' }}>
                A site is a physical location where your work happens. You need at least one.
              </p>
            </div>
            <TextInput
              id="siteName" labelText="Site name" placeholder="e.g. Head Office, Site A"
              value={siteName} onChange={e => setSiteName(e.target.value)} required autoFocus
            />
            <Select id="siteType" labelText="Site type" value={siteType} onChange={e => setSiteType(e.target.value)}>
              <SelectItem value="" text="Select type (optional)" />
              {SITE_TYPES.map(t => <SelectItem key={t.value} value={t.value} text={t.label} />)}
            </Select>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <TextInput id="siteCity" labelText="City" placeholder="Sydney"
                  value={siteCity} onChange={e => setSiteCity(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <TextInput id="siteState" labelText="State / Province"
                  placeholder="NSW" value={siteState} onChange={e => setSiteState(e.target.value)} />
              </div>
            </div>
            <Button type="submit" renderIcon={ArrowRight} disabled={loading} style={{ width: '100%', maxWidth: '100%' }}>
              {loading ? 'Creating…' : 'Create site & continue'}
            </Button>
          </Stack>
        </Form>
      )}

      {/* ── Step 2: Department ─────────────────────────────────── */}
      {step === 2 && (
        <Form onSubmit={handleDeptSubmit}>
          <Stack gap={6}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#161616', marginBottom: '0.5rem' }}>
                Add your first department
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#525252' }}>
                Optional — group your workers into departments for reporting and filtering.
              </p>
            </div>
            <TextInput
              id="deptName" labelText="Department name" placeholder="e.g. Operations, HSE, Maintenance"
              value={deptName} onChange={e => setDeptName(e.target.value)} autoFocus
            />
            <TextInput
              id="deptDesc" labelText="Description (optional)" placeholder="What this department does"
              value={deptDesc} onChange={e => setDeptDesc(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button kind="ghost" onClick={() => setStep(3)} disabled={loading}>
                Skip
              </Button>
              <Button type="submit" renderIcon={ArrowRight} disabled={loading} style={{ flex: 1, maxWidth: '100%' }}>
                {loading ? 'Saving…' : deptName.trim() ? 'Save & continue' : 'Skip'}
              </Button>
            </div>
          </Stack>
        </Form>
      )}

      {/* ── Step 3: Invite team ────────────────────────────────── */}
      {step === 3 && (
        <Form onSubmit={handleInviteSubmit}>
          <Stack gap={6}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#161616', marginBottom: '0.5rem' }}>
                Invite your team
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#525252' }}>
                Optional — they'll receive an email to set a password and join your workspace.
              </p>
            </div>
            <Stack gap={3}>
              {invites.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2, minWidth: 0 }}>
                    <TextInput
                      id={`invite-email-${i}`}
                      labelText={i === 0 ? 'Email address' : ''}
                      placeholder="colleague@company.com"
                      type="email"
                      value={row.email}
                      onChange={e => updateInvite(i, 'email', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Select
                      id={`invite-role-${i}`}
                      labelText={i === 0 ? 'Role' : ''}
                      value={row.roleId}
                      onChange={e => updateInvite(i, 'roleId', e.target.value)}
                    >
                      <SelectItem value="" text="Select role" />
                      {roles.map(r => <SelectItem key={r.id} value={r.id} text={r.name} />)}
                    </Select>
                  </div>
                  {invites.length > 1 && (
                    <Button
                      kind="ghost" size="sm" iconDescription="Remove"
                      renderIcon={TrashCan} hasIconOnly
                      onClick={() => removeInviteRow(i)}
                      style={{ marginBottom: '0.125rem' }}
                    />
                  )}
                </div>
              ))}
              <Button kind="ghost" renderIcon={Add} size="sm" onClick={addInviteRow} style={{ alignSelf: 'flex-start' }}>
                Add another
              </Button>
            </Stack>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button kind="ghost" onClick={() => setStep(4)} disabled={loading}>
                Skip
              </Button>
              <Button type="submit" renderIcon={ArrowRight} disabled={loading} style={{ flex: 1, maxWidth: '100%' }}>
                {loading ? 'Sending…' : invites.some(i => i.email.trim()) ? 'Send invitations' : 'Skip'}
              </Button>
            </div>
          </Stack>
        </Form>
      )}

      {/* ── Step 4: Starter pack ───────────────────────────────── */}
      {step === 4 && (
        <Stack gap={6}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#161616', marginBottom: '0.5rem' }}>
              Load industry templates
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Optional — we'll pre-load inspection templates and risk categories tailored to your industry.
            </p>
          </div>
          {packLoaded ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#defbe6', borderLeft: '3px solid #24a148' }}>
              <CheckmarkFilled size={20} style={{ color: '#24a148', flexShrink: 0 }} />
              <p style={{ fontSize: '0.875rem', color: '#161616' }}>
                {packCount} items loaded — inspection templates and risk categories are ready.
              </p>
            </div>
          ) : (
            <Button kind="secondary" onClick={handleLoadPack} disabled={loading}>
              {loading ? 'Loading…' : 'Load starter templates'}
            </Button>
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button kind="ghost" onClick={() => setStep(5)} disabled={loading}>
              Skip
            </Button>
            <Button renderIcon={ArrowRight} onClick={() => setStep(5)} disabled={loading} style={{ flex: 1, maxWidth: '100%' }}>
              Continue
            </Button>
          </div>
        </Stack>
      )}

      {/* ── Step 5: Done ───────────────────────────────────────── */}
      {step === 5 && (
        <Stack gap={6}>
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '4rem', height: '4rem', borderRadius: '50%', backgroundColor: '#defbe6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              <CheckmarkFilled size={32} style={{ color: '#24a148' }} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#161616', marginBottom: '0.5rem' }}>
              You're all set!
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Your workspace is ready. Start using Lumis.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            {[
              { href: '/incidents/new', label: 'Report an Incident' },
              { href: '/inspections/new', label: 'Start an Inspection' },
              { href: '/risks', label: 'View Risk Register' },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  display: 'block', padding: '0.875rem', backgroundColor: '#fff',
                  border: '1px solid #e0e0e0', textDecoration: 'none',
                  fontSize: '0.875rem', color: '#0f62fe', fontWeight: 500, textAlign: 'center',
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
          {inviteSummary && (
            <p style={{ fontSize: '0.875rem', color: '#525252', textAlign: 'center' }}>{inviteSummary}</p>
          )}
          <Button
            renderIcon={ArrowRight} onClick={handleFinish} disabled={loading}
            style={{ width: '100%', maxWidth: '100%' }}
          >
            {loading ? 'Setting up…' : 'Go to Dashboard'}
          </Button>
        </Stack>
      )}
    </Tile>
  )
}
