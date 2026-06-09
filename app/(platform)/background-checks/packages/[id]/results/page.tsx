import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Tag, Breadcrumb, BreadcrumbItem } from '@carbon/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdjudicationForm from '@/components/background-checks/AdjudicationForm'
import AdverseActionFlow from '@/components/background-checks/AdverseActionFlow'

const CHECK_TYPE_LABELS: Record<string, string> = {
  identity:                   'Identity Verification',
  criminal_standard:          'Criminal Record Check',
  criminal_vulnerable_sector: 'Vulnerable Sector Check',
  drivers_abstract:           'Driver\'s Abstract',
  employment_history:         'Employment History Verification',
  education_credential:       'Education & Credential Verification',
  professional_licence:       'Professional Licence Verification',
  reference_check:            'Reference Checks',
  credit_check:               'Credit Check',
}

const SUMMARY_COLOUR: Record<string, string> = {
  clear: 'green', record_found: 'red', unable_to_determine: 'yellow', refer: 'purple', pending: 'gray',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ResultsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data: pkg } = await supabase
    .from('bgc_packages')
    .select(`
      id, package_number, status,
      candidate_first_name, candidate_last_name, candidate_email, position_title,
      bgc_orders(id, check_type, status, bgc_results(id, result_summary, result_detail, received_at)),
      bgc_adjudications(id, recommendation, rationale, human_rights_considered, adjudicated_at, digital_signature),
      bgc_adverse_action_notices(id, notice_type, sent_at, dispute_window_closes_at, final_decision_at)
    `)
    .eq('id', params.id)
    .eq('organisation_id', orgId)
    .single()

  if (!pkg) return notFound()

  const orders = (pkg.bgc_orders as Array<Record<string, unknown>>) ?? []
  const existingAdjudication = (pkg.bgc_adjudications as Array<Record<string, unknown>>)?.[0] ?? null
  const adverseNotices = (pkg.bgc_adverse_action_notices as Array<Record<string, unknown>>) ?? []
  const hasPreNotice = adverseNotices.some(n => n.notice_type === 'pre')
  const hasFinalNotice = adverseNotices.some(n => n.notice_type === 'final')
  const preNotice = adverseNotices.find(n => n.notice_type === 'pre') ?? null

  const hasRecordFound = orders.some(o => {
    const results = (o.bgc_results as Array<Record<string, unknown>>) ?? []
    return results.some(r => r.result_summary === 'record_found')
  })

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1rem' }}>
        <BreadcrumbItem href="/background-checks">Background Checks</BreadcrumbItem>
        <BreadcrumbItem href={`/background-checks/packages/${params.id}`}>{pkg.package_number}</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Results</BreadcrumbItem>
      </Breadcrumb>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 400, color: '#161616', marginBottom: '0.5rem' }}>
        Background Check Results
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '2rem' }}>
        {pkg.candidate_first_name} {pkg.candidate_last_name} — {pkg.position_title}
      </p>

      {/* Legal notice for reviewers */}
      <div style={{ backgroundColor: '#edf5ff', border: '1px solid #0f62fe', borderRadius: 2, padding: '12px 16px', marginBottom: '1.5rem', fontSize: '0.8125rem', color: '#393939' }}>
        <strong>Important reminder:</strong> Under the Canadian Human Rights Act and provincial human rights codes, you must not automatically disqualify
        a candidate based on a criminal record that is unrelated to the job. Review each finding in the context of the specific role.
        Your adjudication must be based on a considered, individual assessment.
      </div>

      {/* Results per check type */}
      {orders.map(order => {
        const results = (order.bgc_results as Array<Record<string, unknown>>) ?? []
        const result = results[0] ?? null
        return (
          <Tile key={order.id as string} style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: result ? '1px solid #e0e0e0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  {CHECK_TYPE_LABELS[order.check_type as string] ?? order.check_type as string}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#525252', marginTop: 2 }}>
                  {result ? `Received ${formatDate(result.received_at as string)}` : 'Awaiting result'}
                </p>
              </div>
              {result ? (
                <Tag type={SUMMARY_COLOUR[result.result_summary as string] as any ?? 'gray'} style={{ textTransform: 'capitalize' }}>
                  {(result.result_summary as string).replace(/_/g, ' ')}
                </Tag>
              ) : (
                <Tag type="gray">Pending</Tag>
              )}
            </div>
            {result?.result_summary === 'record_found' && (
              <div style={{ padding: '1rem 1.5rem', backgroundColor: '#fff1f1', fontSize: '0.8125rem', color: '#393939' }}>
                <strong>Record found.</strong> Review the full report and assess whether this record is relevant to the
                position before recording your adjudication. A record found result does <em>not</em> automatically
                disqualify this candidate.
                <div style={{ marginTop: 8 }}>
                  <strong>Detail:</strong>{' '}
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                    {JSON.stringify(result.result_detail)}
                  </span>
                </div>
              </div>
            )}
          </Tile>
        )
      })}

      {/* Adverse action flow (only shown when record found) */}
      {hasRecordFound && !existingAdjudication && (
        <AdverseActionFlow
          packageId={params.id}
          hasPreNotice={hasPreNotice}
          hasFinalNotice={hasFinalNotice}
          preNoticeDisputeWindowClosesAt={(preNotice?.dispute_window_closes_at as string) ?? null}
        />
      )}

      {/* Adjudication */}
      {!existingAdjudication && (pkg.status === 'review_pending' || pkg.status === 'adjudicated') && (
        <AdjudicationForm packageId={params.id} />
      )}

      {existingAdjudication && (
        <Tile style={{ padding: '1.5rem', backgroundColor: '#defbe6', border: '1px solid #24a148' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0e6027', marginBottom: 12 }}>Adjudication Recorded</h2>
          <p style={{ fontSize: '0.875rem', marginBottom: 4 }}>
            <strong>Recommendation:</strong>{' '}
            <span style={{ textTransform: 'capitalize' }}>
              {(existingAdjudication.recommendation as string).replace(/_/g, ' ')}
            </span>
          </p>
          <p style={{ fontSize: '0.875rem', marginBottom: 4 }}>
            <strong>Rationale:</strong> {existingAdjudication.rationale as string}
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#525252' }}>
            Recorded by {formatDate(existingAdjudication.adjudicated_at as string)}
          </p>
        </Tile>
      )}
    </div>
  )
}
