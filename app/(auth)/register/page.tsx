'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Form,
  Stack,
  TextInput,
  PasswordInput,
  Select,
  SelectItem,
  InlineNotification,
  Tile,
} from '@carbon/react'
import { ArrowRight, ArrowLeft, Checkmark } from '@carbon/icons-react'
import { createClient } from '@/lib/supabase/client'
import { registerUser } from '@/app/actions/auth'

const INDUSTRIES = [
  'Mining & Resources',
  'Construction',
  'Manufacturing',
  'Transport & Logistics',
  'Healthcare',
  'Agriculture & Farming',
  'Oil & Gas',
  'Government & Public Sector',
  'Retail & Warehousing',
  'Utilities',
  'Education',
  'Other',
]

const TIMEZONES = [
  { label: 'Sydney / Melbourne (AEST)', value: 'Australia/Sydney' },
  { label: 'Brisbane (AEST, no DST)', value: 'Australia/Brisbane' },
  { label: 'Adelaide (ACST)', value: 'Australia/Adelaide' },
  { label: 'Perth (AWST)', value: 'Australia/Perth' },
  { label: 'Darwin (ACST, no DST)', value: 'Australia/Darwin' },
  { label: 'Hobart (AEST)', value: 'Australia/Hobart' },
  { label: 'Auckland (NZST)', value: 'Pacific/Auckland' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'New York (ET)', value: 'America/New_York' },
  { label: 'Los Angeles (PT)', value: 'America/Los_Angeles' },
  { label: 'UTC', value: 'UTC' },
]

type Step = 'account' | 'organisation'

function TopLoader({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <>
      <style>{`
        @keyframes toploader {
          0%   { left: -45%; width: 45% }
          50%  { left: 30%;  width: 55% }
          100% { left: 110%; width: 45% }
        }
      `}</style>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '3px', backgroundColor: '#d0e2ff', zIndex: 9999,
      }}>
        <div style={{
          position: 'absolute', top: 0, height: '100%',
          backgroundColor: '#0f62fe',
          animation: 'toploader 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        }} />
      </div>
    </>
  )
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { key: 'account', label: 'Your account', sub: 'Name, email & password' },
    { key: 'organisation', label: 'Organisation', sub: 'Company details' },
  ] as const
  const currentIndex = steps.findIndex(s => s.key === current)

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
      {steps.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
              <div style={{
                width: '2rem', height: '2rem', borderRadius: '50%',
                backgroundColor: done || active ? '#0f62fe' : 'transparent',
                border: `2px solid ${done || active ? '#0f62fe' : '#c6c6c6'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {done
                  ? <Checkmark size={14} style={{ color: '#ffffff' }} />
                  : <span style={{ fontSize: '0.75rem', fontWeight: 600, color: active ? '#ffffff' : '#6f6f6f' }}>{i + 1}</span>
                }
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400, color: active ? '#161616' : done ? '#525252' : '#6f6f6f', lineHeight: 1.2 }}>
                  {step.label}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.125rem' }}>{step.sub}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: '1px', backgroundColor: done ? '#0f62fe' : '#e0e0e0', margin: '0 1rem', marginBottom: '1.25rem' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // All form state collected client-side — nothing hits the server until final submit
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [industry, setIndustry] = useState('')
  const [timezone, setTimezone] = useState('Australia/Sydney')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard')
      else setCheckingSession(false)
    })
  }, [])

  function handleAccountNext(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) return setError('Passwords do not match.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    setStep('organisation')
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!orgName.trim()) return setError('Organisation name is required.')

    setLoading(true)

    // Server action: creates user + org + profile + role atomically.
    // Rolls back (deletes auth user) if any step fails.
    const result = await registerUser({ email, password, firstName, lastName, orgName, industry, timezone })

    if (result.error) {
      setLoading(false)
      setError(result.error)
      return
    }

    // Sign in client-side to get a browser session
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setLoading(false)
      setError(signInError.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (checkingSession) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#525252', fontSize: '0.875rem' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <TopLoader visible={loading} />
      <div style={{ width: '100%', maxWidth: '520px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#0f62fe', borderRadius: '2px', margin: '0 auto 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#161616', marginBottom: '0.125rem' }}>Create your account</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>Peninsula Health &amp; Safety Platform</p>
        </div>

        <Tile style={{ padding: '2rem' }}>
          <StepIndicator current={step} />

          {error && (
            <InlineNotification
              kind="error" title="Error" subtitle={error} lowContrast
              onCloseButtonClick={() => setError(null)}
              style={{ marginBottom: '1.5rem', maxWidth: '100%' }}
            />
          )}

          {step === 'account' && (
            <Form onSubmit={handleAccountNext}>
              <Stack gap={6}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TextInput id="firstName" labelText="First name" placeholder="Jane"
                      value={firstName} onChange={e => setFirstName(e.target.value)} required autoFocus autoComplete="given-name" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TextInput id="lastName" labelText="Last name" placeholder="Smith"
                      value={lastName} onChange={e => setLastName(e.target.value)} required autoComplete="family-name" />
                  </div>
                </div>
                <TextInput id="email" labelText="Email address" type="email" placeholder="jane@company.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                <PasswordInput id="password" labelText="Password" helperText="Minimum 8 characters"
                  value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required autoComplete="new-password" />
                <PasswordInput id="confirmPassword" labelText="Confirm password"
                  value={confirmPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  required autoComplete="new-password" />
                <Button type="submit" renderIcon={ArrowRight} style={{ width: '100%', maxWidth: '100%' }}>
                  Continue
                </Button>
              </Stack>
            </Form>
          )}

          {step === 'organisation' && (
            <Form onSubmit={handleFinalSubmit}>
              <Stack gap={6}>
                <TextInput id="orgName" labelText="Organisation name" helperText="The name of your company or business unit"
                  placeholder="Acme Pty Ltd" value={orgName} onChange={e => setOrgName(e.target.value)} required autoFocus />
                <Select id="industry" labelText="Industry" helperText="Helps us tailor default templates for your sector"
                  value={industry} onChange={e => setIndustry(e.target.value)}>
                  <SelectItem value="" text="Select industry (optional)" />
                  {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind} text={ind} />)}
                </Select>
                <Select id="timezone" labelText="Timezone" value={timezone} onChange={e => setTimezone(e.target.value)}>
                  {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value} text={tz.label} />)}
                </Select>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Button kind="ghost" renderIcon={ArrowLeft} onClick={() => { setStep('account'); setError(null) }} disabled={loading}>
                    Back
                  </Button>
                  <Button type="submit" renderIcon={ArrowRight} disabled={loading} style={{ flex: 1, maxWidth: '100%' }}>
                    {loading ? 'Creating account…' : 'Create account'}
                  </Button>
                </div>
              </Stack>
            </Form>
          )}
        </Tile>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: '#525252' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#0f62fe', textDecoration: 'none' }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
