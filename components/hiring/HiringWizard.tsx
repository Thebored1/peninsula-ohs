'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, Select, SelectItem,
  Toggle, InlineNotification,
} from '@carbon/react'
import {
  saveHireStep1, saveHireStep2, saveHireStep3,
  runComplianceCheck, acknowledgeComplianceOverride,
  finaliseHire,
  type ComplianceCheckResult,
} from '@/app/actions/hiring'
import { createBgcPackageAndSendConsent } from '@/app/actions/background-checks'
import { ComplianceCheckPanel } from '@/components/hiring/ComplianceCheckPanel'
import { DocumentGenerationPanel } from '@/components/hiring/DocumentGenerationPanel'
import { PreStartChecklist } from '@/components/hiring/PreStartChecklist'

const STEPS = [
  'Candidate Details',
  'Role & Employment',
  'Compensation',
  'Compliance Check',
  'Background Check',
  'Documents',
  'Signatures',
  'Pre-Start Tasks',
  'Complete Hire',
]

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Permanent Full-Time' },
  { value: 'part_time', label: 'Permanent Part-Time' },
  { value: 'contractor', label: 'Independent Contractor' },
  { value: 'casual', label: 'Casual' },
  { value: 'volunteer', label: 'Volunteer' },
]

const PAY_FREQUENCIES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'semi_monthly', label: 'Semi-Monthly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual Salary' },
]

interface Site { id: string; name: string }
interface Department { id: string; name: string }
interface Worker { id: string; first_name: string; last_name: string }
interface HrTemplate { id: string; name: string; template_type: string; description: string | null; is_system_template: boolean }
interface HireDocument { id: string; document_type: string; file_name: string; candidate_signed_at: string | null }

interface Props {
  sites: Site[]
  departments: Department[]
  workers: Worker[]
  hrTemplates: HrTemplate[]
}

export function HiringWizard({ sites, departments, workers, hrTemplates }: Props) {
  const [step, setStep] = useState(1)
  const [hireId, setHireId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Step 4 state
  const [complianceResults, setComplianceResults] = useState<ComplianceCheckResult[]>([])
  const [compliancePassed, setCompliancePassed] = useState(false)
  const [complianceProvince, setComplianceProvince] = useState<string | null>(null)
  const [complianceChecked, setComplianceChecked] = useState(false)

  // Step 5: BGC state
  const [bgcPackageId, setBgcPackageId] = useState<string | null>(null)
  const [bgcConsentSent, setBgcConsentSent] = useState(false)

  // Step 6/7 state
  const [hireDocuments, setHireDocuments] = useState<HireDocument[]>([])

  // Step 2 state
  const [isFixedTerm, setIsFixedTerm] = useState(false)
  const [overtimeEligible, setOvertimeEligible] = useState(false)

  function clearError() { setError(null) }

  // ── Step 1 handler ──
  function handleStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await saveHireStep1(hireId, formData)
      if (result.error) { setError(result.error); return }
      setHireId(result.hireId)
      setStep(2)
    })
  }

  // ── Step 2 handler ──
  function handleStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!hireId) return
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('is_fixed_term', isFixedTerm ? 'true' : 'false')
    startTransition(async () => {
      const result = await saveHireStep2(hireId, formData)
      if (result?.error) { setError(result.error); return }
      setStep(3)
    })
  }

  // ── Step 3 handler ──
  function handleStep3(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!hireId) return
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('overtime_eligible', overtimeEligible ? 'true' : 'false')
    startTransition(async () => {
      const result = await saveHireStep3(hireId, formData)
      if (result?.error) { setError(result.error); return }
      setStep(4)
    })
  }

  // ── Step 4: run compliance check ──
  function handleRunCheck() {
    if (!hireId) return
    setError(null)
    setComplianceChecked(false)
    startTransition(async () => {
      const result = await runComplianceCheck(hireId)
      if (result.error) { setError(result.error); return }
      setComplianceResults(result.results)
      setCompliancePassed(result.passed)
      setComplianceChecked(true)
      // Extract province from first result with a province reference
      const provinceResult = result.results.find(r => r.message.includes('(') && r.message.includes(')'))
      if (!provinceResult) {
        // Try to get it from a specific result
        const minWageResult = result.results.find(r => r.rule_key === 'min_wage_general')
        if (minWageResult) {
          const match = minWageResult.message.match(/\(([A-Z]{2})\)/)
          if (match) setComplianceProvince(match[1])
        }
      }
    })
  }

  function handleAcknowledge(overrides: string[]) {
    if (!hireId) return
    setError(null)
    startTransition(async () => {
      const result = await acknowledgeComplianceOverride(hireId, overrides)
      if (result?.error) { setError(result.error); return }
      setStep(5) // → Background Check step
    })
  }

  // ── Step 5: BGC consent (optional) ──
  function handleBgcSendConsent() {
    if (!hireId) return
    setError(null)
    startTransition(async () => {
      const result = await createBgcPackageAndSendConsent(hireId)
      if (result.error) { setError(result.error); return }
      setBgcPackageId(result.packageId)
      setBgcConsentSent(true)
    })
  }

  function handleBgcSkip() {
    setStep(6)
  }

  function handleBgcNext() {
    setStep(6)
  }

  // ── Step 8: pre-start complete ──
  function handlePreStartComplete() {
    setStep(9)
  }

  // ── Step 9: finalise ──
  function handleFinalise() {
    if (!hireId) return
    setError(null)
    startTransition(async () => {
      const result = await finaliseHire(hireId)
      if (result?.error) { setError(result.error) }
      // On success, finaliseHire redirects to /workers/[id]
    })
  }

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '2rem', overflowX: 'auto' }}>
        {STEPS.map((label, i) => {
          const stepNum = i + 1
          const isDone = step > stepNum
          const isActive = step === stepNum
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem' }}>
                <div style={{
                  width: '1.75rem', height: '1.75rem', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 600,
                  backgroundColor: isDone ? '#24a148' : isActive ? '#0f62fe' : '#e0e0e0',
                  color: isDone || isActive ? '#fff' : '#525252',
                }}>
                  {isDone ? '✓' : stepNum}
                </div>
                <span style={{
                  fontSize: '0.75rem', whiteSpace: 'nowrap',
                  color: isActive ? '#0f62fe' : isDone ? '#24a148' : '#6f6f6f',
                  fontWeight: isActive ? 600 : 400,
                }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: '1.5rem', height: '1px', backgroundColor: isDone ? '#24a148' : '#e0e0e0', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <InlineNotification kind="error" title="Error" subtitle={error}
          onCloseButtonClick={clearError} style={{ marginBottom: '1.5rem', maxWidth: '100%' }} />
      )}

      <Tile style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
            Step {step}: {STEPS[step - 1]}
          </h2>
        </div>
        <div style={{ padding: '1.5rem' }}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <form onSubmit={handleStep1}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <TextInput id="candidate_first_name" name="candidate_first_name" labelText="First Name *" required />
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <TextInput id="candidate_last_name" name="candidate_last_name" labelText="Last Name *" required />
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <TextInput id="candidate_email" name="candidate_email" labelText="Personal Email *" type="email" required />
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <TextInput id="candidate_phone" name="candidate_phone" labelText="Phone" type="tel" />
                </Column>
              </Grid>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Next'}</Button>
            </form>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <form onSubmit={handleStep2}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <TextInput id="position_title" name="position_title" labelText="Position Title *" required />
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <Select id="employment_type" name="employment_type" labelText="Employment Type *" defaultValue="full_time">
                    {EMPLOYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value} text={t.label} />)}
                  </Select>
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <Select id="site_id" name="site_id" labelText="Work Site *">
                    <SelectItem value="" text="Select site…" />
                    {sites.map(s => <SelectItem key={s.id} value={s.id} text={s.name} />)}
                  </Select>
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <Select id="department_id" name="department_id" labelText="Department">
                    <SelectItem value="" text="Select department…" />
                    {departments.map(d => <SelectItem key={d.id} value={d.id} text={d.name} />)}
                  </Select>
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <TextInput id="start_date" name="start_date" labelText="Start Date" type="date" />
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <TextInput id="probation_period_days" name="probation_period_days" labelText="Probation Period (days)" type="number" min="0" max="365" helperText="Leave blank for no probation" />
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <Select id="reports_to_id" name="reports_to_id" labelText="Reporting To">
                    <SelectItem value="" text="Select manager…" />
                    {workers.map(w => <SelectItem key={w.id} value={w.id} text={`${w.first_name} ${w.last_name}`} />)}
                  </Select>
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <Toggle
                    id="is_fixed_term"
                    labelText="Fixed-Term Contract"
                    labelA="Permanent"
                    labelB="Fixed-Term"
                    toggled={isFixedTerm}
                    onToggle={(v: boolean) => setIsFixedTerm(v)}
                  />
                </Column>
                {isFixedTerm && (
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="contract_end_date" name="contract_end_date" labelText="Contract End Date *" type="date" required={isFixedTerm} />
                  </Column>
                )}
              </Grid>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button kind="secondary" onClick={() => setStep(1)} disabled={isPending}>Back</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Next'}</Button>
              </div>
            </form>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <form onSubmit={handleStep3}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <Select id="pay_frequency" name="pay_frequency" labelText="Pay Frequency" defaultValue="biweekly">
                    {PAY_FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value} text={f.label} />)}
                  </Select>
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <TextInput id="hourly_rate" name="hourly_rate" labelText="Hourly Rate (CAD)" type="number" min="0" step="0.01" helperText="For hourly employees" />
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <TextInput id="salary_amount" name="salary_amount" labelText="Annual Salary (CAD)" type="number" min="0" step="100" helperText="For salaried employees" />
                </Column>
                <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                  <Toggle
                    id="overtime_eligible"
                    labelText="Overtime Eligible"
                    labelA="No"
                    labelB="Yes"
                    toggled={overtimeEligible}
                    onToggle={(v: boolean) => setOvertimeEligible(v)}
                  />
                </Column>
              </Grid>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button kind="secondary" onClick={() => setStep(2)} disabled={isPending}>Back</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Next'}</Button>
              </div>
            </form>
          )}

          {/* ── STEP 4 ── */}
          {step === 4 && (
            <div>
              {!complianceChecked ? (
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1.5rem' }}>
                    Run a compliance check to verify the hire details against applicable provincial employment law.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button kind="secondary" onClick={() => setStep(3)} disabled={isPending}>Back</Button>
                    <Button kind="primary" onClick={handleRunCheck} disabled={isPending}>
                      {isPending ? 'Running checks…' : 'Run Compliance Check'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <ComplianceCheckPanel
                    results={complianceResults}
                    passed={compliancePassed}
                    province={complianceProvince}
                    onAcknowledge={handleAcknowledge}
                    isPending={isPending}
                  />
                  {!compliancePassed && complianceResults.some(r => r.severity === 'error') && (
                    <Button kind="secondary" style={{ marginTop: '1rem' }} onClick={() => setStep(3)}>
                      Back to Compensation
                    </Button>
                  )}
                  {compliancePassed && complianceResults.every(r => r.severity !== 'error') && (
                    <Button kind="secondary" style={{ marginTop: '1rem' }} onClick={() => setStep(3)}>
                      Back
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5: Background Check ── */}
          {step === 5 && hireId && (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1rem' }}>
                Background checks are required for certain roles under Canadian workplace law.
                Initiating a check will send a secure consent link to the candidate&apos;s email.
                You can skip this step if no background check is required for this role.
              </p>
              {bgcConsentSent ? (
                <div style={{ backgroundColor: '#defbe6', border: '1px solid #24a148', borderRadius: 4, padding: '1rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#0e6027', fontWeight: 600, marginBottom: 4 }}>
                    ✓ Consent email sent
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: '#525252' }}>
                    The candidate will receive a secure link to review and sign the consent form.
                    You can proceed — the hire can continue while consent is collected.
                  </p>
                  {bgcPackageId && (
                    <a href={`/background-checks/packages/${bgcPackageId}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: '0.8125rem', color: '#0f62fe', display: 'block', marginTop: 8 }}>
                      Track background check →
                    </a>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <Button kind="primary" onClick={handleBgcSendConsent} disabled={isPending}>
                    {isPending ? 'Sending…' : 'Send Consent & Initiate Check'}
                  </Button>
                  <Button kind="ghost" onClick={handleBgcSkip} disabled={isPending}>
                    Skip — no background check required
                  </Button>
                </div>
              )}
              {bgcConsentSent && (
                <Button kind="primary" onClick={handleBgcNext} style={{ marginTop: '1rem' }}>
                  Continue to Documents
                </Button>
              )}
              <Button kind="secondary" onClick={() => setStep(4)} disabled={isPending} style={{ marginTop: '0.5rem' }}>
                Back
              </Button>
            </div>
          )}

          {/* ── STEP 6: Documents ── */}
          {step === 6 && hireId && (
            <div>
              <DocumentGenerationPanel
                hireId={hireId}
                availableTemplates={hrTemplates}
                existingDocuments={hireDocuments}
                onComplete={() => setStep(7)}
              />
              <Button kind="secondary" style={{ marginTop: '1rem' }} onClick={() => setStep(5)}>Back</Button>
            </div>
          )}

          {/* ── STEP 7: Signatures ── */}
          {step === 7 && hireId && (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1.5rem' }}>
                Documents have been generated. Collect candidate signatures below or share the documents for signing.
              </p>
              <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1.5rem' }}>
                View and collect signatures at{' '}
                <a href={`/hiring/${hireId}/documents`} style={{ color: '#0f62fe' }}>
                  /hiring/{hireId}/documents
                </a>.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button kind="secondary" onClick={() => setStep(6)} disabled={isPending}>Back</Button>
                <Button kind="primary" onClick={() => setStep(8)}>
                  Continue to Pre-Start Tasks
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 8: Pre-Start Tasks ── */}
          {step === 8 && hireId && (
            <div>
              <PreStartChecklist
                hireId={hireId}
                onComplete={handlePreStartComplete}
              />
              <Button kind="secondary" style={{ marginTop: '1rem' }} onClick={() => setStep(7)} disabled={isPending}>Back</Button>
            </div>
          )}

          {/* ── STEP 9: Complete Hire ── */}
          {step === 9 && hireId && (
            <div>
              <InlineNotification
                kind="info"
                title="Ready to complete this hire"
                subtitle="This will create a worker profile in the system, trigger onboarding checklists, and add any compliance calendar entries."
                hideCloseButton
                style={{ marginBottom: '1.5rem', maxWidth: '100%' }}
              />
              <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1.5rem' }}>
                The candidate will receive a password-reset email so they can activate their account.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button kind="secondary" onClick={() => setStep(8)} disabled={isPending}>Back</Button>
                <Button kind="primary" disabled={isPending} onClick={handleFinalise}>
                  {isPending ? 'Creating worker profile…' : 'Complete Hire'}
                </Button>
              </div>
            </div>
          )}

        </div>
      </Tile>
    </div>
  )
}
