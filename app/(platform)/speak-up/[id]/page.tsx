import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Tile,
  Tag,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  InlineNotification,
} from '@carbon/react'
import { updateSpeakUpStatus } from '@/app/actions/speak-up'
import AddResponseForm from './AddResponseForm'

type TagType = 'blue' | 'cyan' | 'purple' | 'teal' | 'green' | 'gray' | 'red' | 'magenta'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    received: 'blue',
    under_review: 'cyan',
    investigating: 'purple',
    resolved: 'teal',
    closed: 'green',
  }
  return map[status] ?? 'gray'
}

function severityTag(severity: string): TagType {
  const map: Record<string, TagType> = {
    low: 'green',
    medium: 'blue',
    high: 'magenta',
    critical: 'red',
  }
  return map[severity] ?? 'gray'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p
        style={{
          fontSize: '0.75rem',
          color: '#6f6f6f',
          letterSpacing: '0.32px',
          marginBottom: '0.25rem',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SpeakUpDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: report } = await supabase
    .from('speak_up_reports')
    .select(`
      id, report_number, description, severity, status,
      date_of_incident, location, resolution_notes,
      closed_at, created_at,
      speak_up_categories(id, name),
      sites(id, name),
      assignee:user_profiles!assigned_to(first_name, last_name, email)
    `)
    .eq('id', id)
    .single()

  if (!report) notFound()

  const { data: responses } = await supabase
    .from('speak_up_responses')
    .select(`
      id, response_text, is_visible_to_reporter, created_at,
      responder:user_profiles!responded_by(first_name, last_name, email)
    `)
    .eq('report_id', id)
    .order('created_at', { ascending: true })

  const catRaw = report.speak_up_categories
  const cat = Array.isArray(catRaw)
    ? (catRaw[0] as { id: string; name: string } | undefined) ?? null
    : (catRaw as { id: string; name: string } | null)

  const siteRaw = report.sites
  const site = Array.isArray(siteRaw)
    ? (siteRaw[0] as { id: string; name: string } | undefined) ?? null
    : (siteRaw as { id: string; name: string } | null)

  const assigneeRaw = report.assignee
  const assignee = Array.isArray(assigneeRaw)
    ? (assigneeRaw[0] as { first_name: string; last_name: string; email: string } | undefined) ?? null
    : (assigneeRaw as { first_name: string; last_name: string; email: string } | null)

  const isClosed = report.status === 'closed' || report.status === 'resolved'
  const canClose = !isClosed

  // Next logical status transitions
  const nextStatus: Record<string, string> = {
    received: 'under_review',
    under_review: 'investigating',
    investigating: 'resolved',
    resolved: 'closed',
  }
  const nextStatusLabel: Record<string, string> = {
    received: 'Mark Under Review',
    under_review: 'Start Investigation',
    investigating: 'Mark Resolved',
    resolved: 'Close Report',
  }

  const currentStatus = report.status ?? ''
  const advanceTarget = nextStatus[currentStatus] ?? null
  const advanceLabel = nextStatusLabel[currentStatus] ?? null

  async function handleAdvanceStatus() {
    'use server'
    if (advanceTarget) {
      await updateSpeakUpStatus(id, advanceTarget)
    }
  }

  async function handleClose() {
    'use server'
    await updateSpeakUpStatus(id, 'closed')
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/speak-up">Speak-Up Reports</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          {report.report_number ?? id.slice(0, 8)}
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <div>
          <p
            style={{
              fontSize: '0.75rem',
              color: '#6f6f6f',
              letterSpacing: '0.32px',
              marginBottom: '0.25rem',
              textTransform: 'uppercase',
            }}
          >
            {report.report_number ?? '—'}
          </p>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.75rem',
            }}
          >
            Anonymous Report
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Tag type={statusTag(report.status ?? '')} size="md">
              {(report.status ?? '').replace(/_/g, ' ')}
            </Tag>
            <Tag type={severityTag(report.severity ?? '')} size="md">
              {(report.severity ?? '').replace(/_/g, ' ')} severity
            </Tag>
            {cat && (
              <Tag type="cool-gray" size="md">
                {cat.name}
              </Tag>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
          {advanceLabel && report.status !== 'resolved' && (
            <form action={handleAdvanceStatus}>
              <Button kind="primary" type="submit" size="sm">
                {advanceLabel}
              </Button>
            </form>
          )}
          {report.status === 'resolved' && canClose && (
            <form action={handleClose}>
              <Button kind="secondary" type="submit" size="sm">
                Close Report
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Anonymous reminder */}
      <div style={{ marginBottom: '1.5rem' }}>
        <InlineNotification
          kind="info"
          title="Anonymous report"
          subtitle="This report was submitted anonymously. No personally identifiable information was collected from the reporter."
          lowContrast
          hideCloseButton
        />
      </div>

      <Grid condensed>
        {/* Left column: report details + description + responses */}
        <Column sm={4} md={8} lg={10}>
          {/* Details */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Report Details
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Category">{cat?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Severity">
                    <Tag type={severityTag(report.severity ?? '')} size="sm">
                      {(report.severity ?? '—').replace(/_/g, ' ')}
                    </Tag>
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Date of Incident">
                    {formatDate(report.date_of_incident)}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Location">{report.location ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Site">{site?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Submitted">{formatDate(report.created_at)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Assigned To">
                    {assignee
                      ? `${assignee.first_name} ${assignee.last_name}`
                      : '—'}
                  </DetailRow>
                </Column>
                {report.closed_at && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Closed">{formatDate(report.closed_at)}</DetailRow>
                  </Column>
                )}
              </Grid>
            </div>
          </Tile>

          {/* Description */}
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
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {report.description || '—'}
              </p>
            </div>
          </Tile>

          {/* Resolution notes */}
          {report.resolution_notes && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Resolution Notes
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: '#161616',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {report.resolution_notes}
                </p>
              </div>
            </Tile>
          )}

          {/* Responses */}
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
                Responses
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                {(responses ?? []).length}{' '}
                {(responses ?? []).length === 1 ? 'response' : 'responses'}
              </span>
            </div>

            <div>
              {(responses ?? []).length === 0 ? (
                <div
                  style={{
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    color: '#6f6f6f',
                    fontSize: '0.875rem',
                  }}
                >
                  No responses yet. Add the first response below.
                </div>
              ) : (
                (responses ?? []).map((resp, i) => {
                  const r = resp as typeof resp & {
                    responder: { first_name: string; last_name: string; email: string } | null
                  }
                  const authorName = r.responder
                    ? `${r.responder.first_name} ${r.responder.last_name}`
                    : 'Staff member'

                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: '1rem 1.5rem',
                        borderBottom:
                          i < (responses ?? []).length - 1 ? '1px solid #e0e0e0' : 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: '#161616',
                            }}
                          >
                            {authorName}
                          </span>
                          {r.is_visible_to_reporter && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#24a148',
                                marginLeft: '0.5rem',
                              }}
                            >
                              (visible to reporter)
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#6f6f6f',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDateTime(r.created_at)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: '0.875rem',
                          color: '#161616',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {r.response_text}
                      </p>
                    </div>
                  )
                })
              )}

              {/* Add response form */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid #e0e0e0',
                }}
              >
                <AddResponseForm reportId={id} />
              </div>
            </div>
          </Tile>
        </Column>

        {/* Right column: status workflow */}
        <Column sm={4} md={8} lg={6}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Workflow
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {/* Status steps */}
              {(['received', 'under_review', 'investigating', 'resolved', 'closed'] as const).map(
                (step) => {
                  const stepLabels: Record<string, string> = {
                    received: 'Received',
                    under_review: 'Under Review',
                    investigating: 'Investigating',
                    resolved: 'Resolved',
                    closed: 'Closed',
                  }
                  const statusOrder = ['received', 'under_review', 'investigating', 'resolved', 'closed']
                  const currentIdx = statusOrder.indexOf(report.status ?? '')
                  const stepIdx = statusOrder.indexOf(step)
                  const isDone = stepIdx <= currentIdx
                  const isCurrent = step === report.status

                  return (
                    <div
                      key={step}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          width: '1.5rem',
                          height: '1.5rem',
                          borderRadius: '50%',
                          backgroundColor: isDone ? '#0f62fe' : '#e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isDone && (
                          <svg
                            width="10"
                            height="8"
                            viewBox="0 0 10 8"
                            fill="none"
                          >
                            <path
                              d="M1 4L3.5 6.5L9 1"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: isCurrent ? 600 : 400,
                          color: isCurrent ? '#161616' : isDone ? '#525252' : '#a8a8a8',
                        }}
                      >
                        {stepLabels[step]}
                        {isCurrent && (
                          <span
                            style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.75rem',
                              color: '#0f62fe',
                              fontWeight: 400,
                            }}
                          >
                            (current)
                          </span>
                        )}
                      </span>
                    </div>
                  )
                }
              )}

              {/* Advance button */}
              {advanceLabel && (
                <div style={{ marginTop: '1.5rem' }}>
                  <form action={handleAdvanceStatus}>
                    <Button kind="primary" type="submit" size="md" style={{ width: '100%' }}>
                      {advanceLabel}
                    </Button>
                  </form>
                </div>
              )}

              {isClosed && (
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: '#6f6f6f',
                    textAlign: 'center',
                    marginTop: '1rem',
                  }}
                >
                  This report has been closed.
                </p>
              )}
            </div>
          </Tile>

          {/* Quick info */}
          <Tile style={{ padding: 0 }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Summary
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <DetailRow label="Report Number">{report.report_number ?? '—'}</DetailRow>
              <DetailRow label="Status">
                <Tag type={statusTag(report.status ?? '')} size="sm">
                  {(report.status ?? '—').replace(/_/g, ' ')}
                </Tag>
              </DetailRow>
              <DetailRow label="Severity">
                <Tag type={severityTag(report.severity ?? '')} size="sm">
                  {(report.severity ?? '—').replace(/_/g, ' ')}
                </Tag>
              </DetailRow>
              <DetailRow label="Submitted">{formatDate(report.created_at)}</DetailRow>
              <DetailRow label="Responses">
                {(responses ?? []).length}
              </DetailRow>
            </div>
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
