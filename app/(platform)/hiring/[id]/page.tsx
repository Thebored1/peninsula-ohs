import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Tile, Tag } from '@carbon/react'
import Link from 'next/link'
import type { ComplianceCheckResult } from '@/app/actions/hiring'

interface PageProps { params: Promise<{ id: string }> }

const STEP_LABELS = [
  'Candidate Details', 'Role & Employment', 'Compensation',
  'Compliance Check', 'Documents', 'Signatures', 'Pre-Start Tasks', 'Complete',
]

const STATUS_COLOURS: Record<string, 'green' | 'blue' | 'teal' | 'gray' | 'red'> = {
  draft: 'gray', in_progress: 'blue', pending_signature: 'teal', completed: 'green', cancelled: 'gray',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.25rem' }}>{label}</p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{value}</div>
    </div>
  )
}

export default async function HireDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data: hire } = await supabase
    .from('hires')
    .select('*, sites(name), departments(name), user_profiles!reports_to_id(first_name, last_name)')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  if (!hire) notFound()

  const { data: docs } = await supabase
    .from('hire_documents')
    .select('id, document_type, file_name, candidate_signed_at')
    .eq('hire_id', id)

  const site = Array.isArray(hire.sites) ? hire.sites[0] : hire.sites as { name: string } | null
  const dept = Array.isArray(hire.departments) ? hire.departments[0] : hire.departments as { name: string } | null
  const manager = Array.isArray(hire.user_profiles) ? hire.user_profiles[0] : hire.user_profiles as { first_name: string; last_name: string } | null

  const complianceResults = (hire.compliance_check_results ?? []) as ComplianceCheckResult[]
  const hasErrors = complianceResults.some(r => r.severity === 'error')

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/hiring">Hiring</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{hire.hire_number ?? 'Draft Hire'}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            {hire.candidate_first_name ?? ''} {hire.candidate_last_name ?? ''}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>{hire.hire_number ?? 'Draft'} · {hire.position_title ?? 'Position TBC'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Tag type={STATUS_COLOURS[hire.status] ?? 'gray'}>{hire.status.replace(/_/g, ' ')}</Tag>
          {hire.status !== 'completed' && hire.status !== 'cancelled' && (
            <Link href="/hiring/new" style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
              Continue Wizard →
            </Link>
          )}
        </div>
      </div>

      {/* Step progress */}
      <Tile style={{ padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: '#f4f4f4' }}>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1
            const isDone = hire.current_step > stepNum
            const isActive = hire.current_step === stepNum
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0 0.5rem' }}>
                  <div style={{
                    width: '1.5rem', height: '1.5rem', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6875rem', fontWeight: 600,
                    backgroundColor: isDone ? '#24a148' : isActive ? '#0f62fe' : '#e0e0e0',
                    color: isDone || isActive ? '#fff' : '#525252',
                  }}>
                    {isDone ? '✓' : stepNum}
                  </div>
                  <span style={{ fontSize: '0.6875rem', whiteSpace: 'nowrap', color: isActive ? '#0f62fe' : isDone ? '#24a148' : '#6f6f6f' }}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div style={{ width: '1rem', height: '1px', backgroundColor: isDone ? '#24a148' : '#e0e0e0', flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>
      </Tile>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Candidate */}
        <Tile style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Candidate</h2>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <Row label="Name" value={`${hire.candidate_first_name ?? ''} ${hire.candidate_last_name ?? ''}`.trim() || '—'} />
            <Row label="Email" value={hire.candidate_email ?? '—'} />
            <Row label="Phone" value={hire.candidate_phone ?? '—'} />
          </div>
        </Tile>

        {/* Role */}
        <Tile style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Role & Employment</h2>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <Row label="Position" value={hire.position_title ?? '—'} />
            <Row label="Employment Type" value={hire.employment_type?.replace(/_/g, ' ') ?? '—'} />
            <Row label="Site" value={site?.name ?? '—'} />
            <Row label="Department" value={dept?.name ?? '—'} />
            <Row label="Start Date" value={formatDate(hire.start_date)} />
            <Row label="Probation" value={hire.probation_period_days ? `${hire.probation_period_days} days` : 'None'} />
            <Row label="Manager" value={manager ? `${manager.first_name} ${manager.last_name}` : '—'} />
            {hire.is_fixed_term && (
              <Row label="Contract End" value={formatDate(hire.contract_end_date)} />
            )}
          </div>
        </Tile>

        {/* Compensation */}
        <Tile style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Compensation</h2>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {hire.hourly_rate && <Row label="Hourly Rate" value={`$${hire.hourly_rate} CAD/hr`} />}
            {hire.salary_amount && <Row label="Annual Salary" value={`$${Number(hire.salary_amount).toLocaleString('en-CA')} CAD`} />}
            <Row label="Pay Frequency" value={hire.pay_frequency?.replace(/_/g, ' ') ?? '—'} />
            <Row label="Overtime Eligible" value={hire.overtime_eligible ? 'Yes' : 'No'} />
          </div>
        </Tile>

        {/* Compliance */}
        <Tile style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Compliance</h2>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <Row label="Province" value={hire.compliance_province ?? '—'} />
            <Row label="Check Passed" value={
              hire.compliance_passed_at
                ? <Tag type="green" size="sm">Passed</Tag>
                : hasErrors
                  ? <Tag type="red" size="sm">Errors</Tag>
                  : <Tag type="gray" size="sm">Not run</Tag>
            } />
            {complianceResults.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                {complianceResults.filter(r => r.severity === 'error').map((r, i) => (
                  <p key={i} style={{ fontSize: '0.8125rem', color: '#da1e28', marginBottom: '0.25rem' }}>⚠ {r.message}</p>
                ))}
              </div>
            )}
          </div>
        </Tile>
      </div>

      {/* Documents */}
      {(docs ?? []).length > 0 && (
        <Tile style={{ padding: 0, marginTop: '1rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Documents</h2>
            <Link href={`/hiring/${id}/documents`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>Manage signatures</Link>
          </div>
          <div>
            {(docs ?? []).map((doc, i) => (
              <div key={doc.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.875rem 1.5rem',
                borderBottom: i < (docs ?? []).length - 1 ? '1px solid #f4f4f4' : 'none',
              }}>
                <span style={{ fontSize: '0.875rem', color: '#161616' }}>{doc.file_name}</span>
                <Tag type={doc.candidate_signed_at ? 'green' : 'gray'} size="sm">
                  {doc.candidate_signed_at ? 'Signed' : 'Awaiting signature'}
                </Tag>
              </div>
            ))}
          </div>
        </Tile>
      )}

      {/* Pre-start tasks */}
      <div style={{ marginTop: '1rem' }}>
        <Link href={`/hiring/${id}/checklist`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
          View pre-start checklist →
        </Link>
      </div>
    </div>
  )
}
