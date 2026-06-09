import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Tag, Breadcrumb, BreadcrumbItem } from '@carbon/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ConsentActions from './ConsentActions'

const CHECK_TYPE_LABELS: Record<string, string> = {
  identity:                   'Identity Verification',
  criminal_standard:          'Criminal Record Check',
  criminal_vulnerable_sector: 'Vulnerable Sector Check',
  drivers_abstract:           'Driver\'s Abstract',
  employment_history:         'Employment History Verification',
  education_credential:       'Education & Credential Verification',
  professional_licence:       'Professional Licence Verification',
  reference_check:            'Professional Reference Checks',
  credit_check:               'Credit Check',
}

const STATUS_COLOUR: Record<string, string> = {
  draft: 'gray', consent_pending: 'yellow', consent_given: 'teal',
  ordering: 'blue', in_progress: 'blue', review_pending: 'red',
  adjudicated: 'purple', complete: 'green', withdrawn: 'gray',
  // order statuses
  ordered: 'blue', completed: 'green', under_review: 'red',
  adjudicated_order: 'purple', cancelled: 'gray', error: 'red',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PackageDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data: pkg } = await supabase
    .from('bgc_packages')
    .select(`
      *,
      bgc_orders(*),
      bgc_consent_records(id, consented_check_types, signed_at, candidate_signature),
      bgc_adjudications(id, recommendation, rationale, adjudicated_at, human_rights_considered),
      bgc_adverse_action_notices(id, notice_type, sent_at, dispute_window_closes_at, final_decision_at)
    `)
    .eq('id', params.id)
    .eq('organisation_id', orgId)
    .single()

  if (!pkg) return notFound()

  const orders = (pkg.bgc_orders as Array<Record<string, string>>) ?? []
  const consentRecord = (pkg.bgc_consent_records as Array<Record<string, unknown>>)?.[0] ?? null
  const adjudication = (pkg.bgc_adjudications as Array<Record<string, unknown>>)?.[0] ?? null
  const adverseNotices = (pkg.bgc_adverse_action_notices as Array<Record<string, unknown>>) ?? []

  const PKG_STATUS_STEPS = ['draft','consent_pending','consent_given','ordering','in_progress','review_pending','adjudicated','complete']
  const currentStepIdx = PKG_STATUS_STEPS.indexOf(pkg.status)

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1rem' }}>
        <BreadcrumbItem href="/background-checks">Background Checks</BreadcrumbItem>
        <BreadcrumbItem href="/background-checks/packages">Packages</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{pkg.package_number ?? 'Package'}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 400, color: '#161616', marginBottom: 4 }}>
            {pkg.package_number} — {pkg.candidate_first_name} {pkg.candidate_last_name}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>{pkg.position_title}</p>
        </div>
        <Tag type={STATUS_COLOUR[pkg.status] as any ?? 'gray'} style={{ textTransform: 'capitalize' }}>
          {(pkg.status as string).replace(/_/g, ' ')}
        </Tag>
      </div>

      {/* Progress bar */}
      <Tile style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {PKG_STATUS_STEPS.filter(s => s !== 'withdrawn').map((step, i) => (
            <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                height: 6, borderRadius: 3, width: '100%',
                backgroundColor: i <= currentStepIdx ? '#0f62fe' : '#e0e0e0',
              }} />
              <span style={{ fontSize: 10, color: i <= currentStepIdx ? '#0f62fe' : '#8d8d8d', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {step.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </Tile>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Candidate info */}
        <Tile style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>Candidate</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.875rem' }}>
            <dt style={{ color: '#525252' }}>Name</dt>
            <dd style={{ color: '#161616', margin: 0 }}>{pkg.candidate_first_name} {pkg.candidate_last_name}</dd>
            <dt style={{ color: '#525252' }}>Email</dt>
            <dd style={{ color: '#161616', margin: 0 }}>{pkg.candidate_email ?? '—'}</dd>
            <dt style={{ color: '#525252' }}>Position</dt>
            <dd style={{ color: '#161616', margin: 0 }}>{pkg.position_title ?? '—'}</dd>
            <dt style={{ color: '#525252' }}>Province</dt>
            <dd style={{ color: '#161616', margin: 0 }}>{pkg.province ?? '—'}</dd>
          </dl>
        </Tile>

        {/* Consent status */}
        <Tile style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>Consent</h2>
          {consentRecord ? (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#24a148', fontWeight: 600, marginBottom: 8 }}>✓ Consent received</p>
              <p style={{ fontSize: '0.8125rem', color: '#525252' }}>Signed: {formatDate(consentRecord.signed_at as string)}</p>
              <p style={{ fontSize: '0.8125rem', color: '#525252' }}>Signature: {consentRecord.candidate_signature as string}</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#f1c21b', fontWeight: 600, marginBottom: 12 }}>Awaiting candidate consent</p>
              {pkg.consent_email_sent_at && (
                <p style={{ fontSize: '0.8125rem', color: '#525252', marginBottom: 12 }}>
                  Email sent: {formatDate(pkg.consent_email_sent_at)}
                </p>
              )}
              <ConsentActions packageId={pkg.id} />
            </div>
          )}
        </Tile>
      </div>

      {/* Check orders */}
      <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Check Orders</h2>
          {(pkg.status === 'consent_given') && (
            <Link href={`/background-checks/packages/${pkg.id}/orders`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
              Submit orders →
            </Link>
          )}
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>No orders yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontWeight: 600, color: '#525252' }}>Check Type</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontWeight: 600, color: '#525252' }}>Provider</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontWeight: 600, color: '#525252' }}>Status</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontWeight: 600, color: '#525252' }}>Expected</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => (
                <tr key={o.id} style={{ borderBottom: idx < orders.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                  <td style={{ padding: '0.75rem 1.5rem', color: '#161616' }}>{CHECK_TYPE_LABELS[o.check_type] ?? o.check_type}</td>
                  <td style={{ padding: '0.75rem 1.5rem', color: '#525252' }}>{o.provider_code ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1.5rem' }}>
                    <Tag type={STATUS_COLOUR[o.status] as any ?? 'gray'} size="sm">
                      {o.status.replace(/_/g, ' ')}
                    </Tag>
                  </td>
                  <td style={{ padding: '0.75rem 1.5rem', color: '#525252' }}>{formatDate(o.expected_by ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Tile>

      {/* Actions */}
      {(pkg.status === 'review_pending' || pkg.status === 'adjudicated') && (
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href={`/background-checks/packages/${pkg.id}/results`}
            style={{ backgroundColor: '#0f62fe', color: '#fff', padding: '10px 20px', borderRadius: 2, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
            View Results
          </Link>
          {!adjudication && (
            <Link href={`/background-checks/packages/${pkg.id}/adjudication`}
              style={{ backgroundColor: '#fff', color: '#0f62fe', padding: '10px 20px', borderRadius: 2, border: '1px solid #0f62fe', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
              Record Adjudication
            </Link>
          )}
        </div>
      )}

      {/* Adverse action notices */}
      {adverseNotices.length > 0 && (
        <Tile style={{ padding: '1.5rem', marginTop: '1.5rem', backgroundColor: '#fff1f1', border: '1px solid #fa4d56' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#da1e28', marginBottom: 12 }}>
            Adverse Action Process
          </h2>
          {adverseNotices.map((n, i) => (
            <div key={i} style={{ marginBottom: 8, fontSize: '0.875rem' }}>
              <strong>{(n.notice_type as string).toUpperCase()} Notice</strong>
              {' '}sent {formatDate(n.sent_at as string)}
              {Boolean(n.dispute_window_closes_at) && (
                <span style={{ color: '#525252' }}> — dispute window closes {formatDate(n.dispute_window_closes_at as string)}</span>
              )}
            </div>
          ))}
          <Link href={`/background-checks/packages/${pkg.id}/results`} style={{ fontSize: '0.875rem', color: '#da1e28' }}>
            Manage adverse action →
          </Link>
        </Tile>
      )}
    </div>
  )
}
