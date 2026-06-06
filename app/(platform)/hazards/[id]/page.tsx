import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Tile,
  Tag,
  Breadcrumb,
  BreadcrumbItem,
} from '@carbon/react'
import HazardReviewForm from './HazardReviewForm'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

type SeverityTagType = 'teal' | 'blue' | 'red'

const severityTagType: Record<string, SeverityTagType> = {
  low: 'teal',
  medium: 'blue',
  high: 'red',
  critical: 'red',
}

type StatusTagType =
  | 'gray'
  | 'blue'
  | 'teal'
  | 'purple'
  | 'cyan'
  | 'red'
  | 'green'
  | 'magenta'

const statusTagType: Record<string, StatusTagType> = {
  submitted: 'blue',
  under_review: 'purple',
  promoted_to_risk: 'cyan',
  actioned: 'teal',
  closed: 'gray',
  rejected: 'red',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function HazardDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: report } = await supabase
    .from('hazard_reports')
    .select(`
      id,
      report_number,
      title,
      description,
      location_details,
      severity_perception,
      status,
      reported_at,
      reviewed_at,
      review_notes,
      action_taken,
      promoted_to_risk_id,
      hazard_category,
      observed_at,
      immediate_risk_to_people,
      suggested_control,
      evidence_file_url,
      evidence_file_name,
      user_profiles!reported_by(first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (!report) notFound()

  const { data: evidenceRows } = await supabase
    .from('hazard_report_evidence')
    .select('id, file_name, description, uploaded_at')
    .eq('report_id', id)
    .order('uploaded_at', { ascending: false })

  const evidence = evidenceRows ?? []

  const profile = Array.isArray(report.user_profiles)
    ? report.user_profiles[0]
    : report.user_profiles
  const reporterName =
    [
      (profile as { first_name?: string } | null)?.first_name ?? '',
      (profile as { last_name?: string } | null)?.last_name ?? '',
    ]
      .filter(Boolean)
      .join(' ') || '—'

  const canReview =
    report.status === 'submitted' || report.status === 'under_review'

  return (
    <div style={{ padding: '2rem' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/hazards">Hazard Reports</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          {report.report_number ?? report.id}
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p
          style={{
            fontSize: '0.75rem',
            color: '#6f6f6f',
            letterSpacing: '0.32px',
            marginBottom: '0.25rem',
          }}
        >
          {report.report_number ?? '—'}
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>
          {report.title}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Tag type={severityTagType[report.severity_perception] ?? 'gray'} size="md">
              {report.severity_perception
                ? report.severity_perception.charAt(0).toUpperCase() +
                  report.severity_perception.slice(1)
                : '—'}
            </Tag>
            <Tag type={statusTagType[report.status] ?? 'gray'} size="md">
              {report.status?.replace(/_/g, ' ')}
            </Tag>
          </div>
          <a href={`/hazards/${id}/edit`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
            Edit
          </a>
        </div>
      </div>

      <Grid condensed>
        {/* Left column: details + description */}
        <Column sm={4} md={5} lg={11}>
          {/* Details tile */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Details
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: '10rem 1fr',
                  rowGap: '1rem',
                  columnGap: '1rem',
                }}
              >
                <dt style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px' }}>
                  Location
                </dt>
                <dd style={{ fontSize: '0.875rem', color: '#161616', margin: 0 }}>
                  {report.location_details || '—'}
                </dd>

                <dt style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px' }}>
                  Severity
                </dt>
                <dd style={{ fontSize: '0.875rem', color: '#161616', margin: 0 }}>
                  {report.severity_perception
                    ? report.severity_perception.charAt(0).toUpperCase() +
                      report.severity_perception.slice(1)
                    : '—'}
                </dd>

                <dt style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px' }}>
                  Reported By
                </dt>
                <dd style={{ fontSize: '0.875rem', color: '#161616', margin: 0 }}>
                  {reporterName}
                </dd>

                <dt style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px' }}>
                  Reported At
                </dt>
                <dd style={{ fontSize: '0.875rem', color: '#161616', margin: 0 }}>
                  {report.reported_at ? formatDate(report.reported_at) : '—'}
                </dd>

                {report.review_notes && (
                  <>
                    <dt style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px' }}>
                      Review Notes
                    </dt>
                    <dd style={{ fontSize: '0.875rem', color: '#161616', margin: 0 }}>
                      {report.review_notes}
                    </dd>
                  </>
                )}

                {report.hazard_category && (
                  <>
                    <dt style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px' }}>
                      Category
                    </dt>
                    <dd style={{ fontSize: '0.875rem', color: '#161616', margin: 0, textTransform: 'capitalize' }}>
                      {report.hazard_category}
                    </dd>
                  </>
                )}

                {report.observed_at && (
                  <>
                    <dt style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px' }}>
                      Observed On
                    </dt>
                    <dd style={{ fontSize: '0.875rem', color: '#161616', margin: 0 }}>
                      {formatDate(report.observed_at)}
                    </dd>
                  </>
                )}

                <dt style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px' }}>
                  Immediate Risk to People
                </dt>
                <dd style={{ fontSize: '0.875rem', color: '#161616', margin: 0 }}>
                  {report.immediate_risk_to_people ? 'Yes' : 'No'}
                </dd>

                {report.suggested_control && (
                  <>
                    <dt style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px' }}>
                      Suggested Control
                    </dt>
                    <dd style={{ fontSize: '0.875rem', color: '#161616', margin: 0 }}>
                      {report.suggested_control}
                    </dd>
                  </>
                )}

                {report.action_taken && (
                  <>
                    <dt style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px' }}>
                      Action Taken
                    </dt>
                    <dd style={{ fontSize: '0.875rem', color: '#161616', margin: 0 }}>
                      {report.action_taken}
                    </dd>
                  </>
                )}
              </dl>

              {report.status === 'promoted_to_risk' && report.promoted_to_risk_id && (
                <div
                  style={{
                    marginTop: '1.5rem',
                    padding: '0.75rem 1rem',
                    background: '#f4f4f4',
                    borderLeft: '3px solid #0f62fe',
                  }}
                >
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.25rem', letterSpacing: '0.32px' }}>
                    Promoted to Risk
                  </p>
                  <a
                    href={`/risks/${report.promoted_to_risk_id}`}
                    style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
                  >
                    View Risk Record
                  </a>
                </div>
              )}
            </div>
          </Tile>

          {/* Description tile */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Description
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#161616',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}
              >
                {report.description}
              </p>
            </div>
          </Tile>

          {/* Evidence tile */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Evidence
              </h2>
            </div>
            {evidence.length === 0 && !report.evidence_file_url ? (
              <div
                style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  color: '#6f6f6f',
                }}
              >
                No evidence attached
              </div>
            ) : (
              <div>
                {/* Inline evidence uploaded via the report form */}
                {report.evidence_file_url && (
                  <div
                    style={{
                      padding: '0.875rem 1.5rem',
                      borderBottom: evidence.length > 0 ? '1px solid #e0e0e0' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.125rem',
                    }}
                  >
                    <a
                      href={report.evidence_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f62fe', textDecoration: 'none' }}
                    >
                      {report.evidence_file_name ?? 'Attached file'}
                    </a>
                    <span style={{ fontSize: '0.75rem', color: '#525252' }}>
                      Submitted with report
                    </span>
                  </div>
                )}
                {evidence.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '0.875rem 1.5rem',
                      borderBottom:
                        i < evidence.length - 1 ? '1px solid #e0e0e0' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.125rem',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                      {item.file_name}
                    </span>
                    {item.description && (
                      <span style={{ fontSize: '0.75rem', color: '#525252' }}>
                        {item.description}
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                      Uploaded {item.uploaded_at ? formatDate(item.uploaded_at) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Tile>
        </Column>

        {/* Right column: review panel */}
        {canReview && (
          <Column sm={4} md={3} lg={5}>
            <HazardReviewForm
              reportId={id}
              currentStatus={report.status}
            />
          </Column>
        )}
      </Grid>
    </div>
  )
}
