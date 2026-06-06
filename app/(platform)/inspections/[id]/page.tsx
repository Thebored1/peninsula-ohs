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
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react'
import { submitInspection, cancelInspection } from '@/app/actions/inspections'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    scheduled: 'blue',
    draft: 'gray',
    in_progress: 'teal',
    completed: 'cyan',
    submitted: 'green',
    cancelled: 'gray',
  }
  return map[status] ?? 'gray'
}

function resultTag(result: string | null): TagType {
  if (!result) return 'gray'
  return ({ pass: 'green', conditional_pass: 'teal', fail: 'red' } as Record<string, TagType>)[result] ?? 'gray'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
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

export default async function InspectionDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: inspection } = await supabase
    .from('inspections')
    .select(`
      id, inspection_number, status, result, score, notes, is_overdue, has_open_actions,
      total_questions, required_questions, answered_questions, failed_questions,
      started_at, completed_at, submitted_at, created_at, template_version,
      conducted_by, submitted_by,
      inspection_types(name),
      inspection_templates(id, name, passing_score_threshold),
      sites(name)
    `)
    .eq('id', id)
    .single()

  if (!inspection) notFound()

  // Conductor name
  let conductorName: string | null = null
  if (inspection.conducted_by) {
    const { data: conductor } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', inspection.conducted_by)
      .single()
    if (conductor) conductorName = `${conductor.first_name} ${conductor.last_name}`
  }

  // Responses with question text + section
  const { data: responses } = await supabase
    .from('inspection_responses')
    .select(`
      id, is_failed, is_na, response_value, response_numeric, notes,
      inspection_template_questions(
        question_text, question_type, order_index,
        inspection_template_sections(title)
      )
    `)
    .eq('inspection_id', id)
    .order('created_at')

  // Linked CAPA actions
  const { data: linkedActions } = await supabase
    .from('inspection_actions')
    .select(`
      id, issue_description,
      actions(id, action_number, title, status, priority)
    `)
    .eq('inspection_id', id)

  const typeRaw = inspection.inspection_types
  const tplRaw = inspection.inspection_templates
  const siteRaw = inspection.sites
  const type = Array.isArray(typeRaw) ? typeRaw[0] ?? null : typeRaw
  const tpl = Array.isArray(tplRaw) ? tplRaw[0] ?? null : tplRaw
  const site = Array.isArray(siteRaw) ? siteRaw[0] ?? null : siteRaw

  const canConduct = !['submitted', 'cancelled'].includes(inspection.status)
  const canSubmit = ['draft', 'in_progress', 'completed'].includes(inspection.status)
  const canCancel = !['submitted', 'cancelled'].includes(inspection.status)

  const scoreNum = inspection.score != null ? Number(inspection.score) : null
  const passingThreshold = (tpl as { passing_score_threshold: number } | null)?.passing_score_threshold ?? 80

  async function handleSubmit() {
    'use server'
    await submitInspection(id)
  }

  async function handleCancel() {
    'use server'
    await cancelInspection(id)
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/inspections">Inspections</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          {inspection.inspection_number ?? id.slice(0, 8)}
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div
        style={{
          marginBottom: '1.5rem',
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
            {inspection.inspection_number ?? '—'}
          </p>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.75rem',
            }}
          >
            {(tpl as { name: string } | null)?.name ?? 'Inspection'}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Tag type={statusTag(inspection.status)} size="md">
              {inspection.status?.replace(/_/g, ' ')}
            </Tag>
            {inspection.result && (
              <Tag type={resultTag(inspection.result)} size="md">
                {inspection.result.replace(/_/g, ' ')}
              </Tag>
            )}
            {inspection.is_overdue && (
              <Tag type="red" size="md">Overdue</Tag>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {canConduct && (
            <Button kind="primary" href={`/inspections/${id}/conduct`} size="sm">
              Conduct Inspection
            </Button>
          )}
          {canSubmit && (
            <form action={handleSubmit}>
              <Button type="submit" kind="secondary" size="sm">
                Submit
              </Button>
            </form>
          )}
          {canCancel && (
            <form action={handleCancel}>
              <Button type="submit" kind="danger--ghost" size="sm">
                Cancel
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Overdue warning */}
      {inspection.is_overdue && inspection.status !== 'submitted' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <InlineNotification
            kind="warning"
            title="Overdue"
            subtitle="This inspection is past its due date and has not been submitted."
            lowContrast
          />
        </div>
      )}

      <Grid condensed>
        {/* Left column */}
        <Column sm={4} md={8} lg={8}>
          {/* Inspection details */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Inspection Details
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Type">
                    {(type as { name: string } | null)?.name ?? '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Template">
                    {(tpl as { name: string } | null)?.name ?? '—'}
                    {inspection.template_version != null && (
                      <span style={{ color: '#6f6f6f', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                        v{inspection.template_version}
                      </span>
                    )}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Site">
                    {(site as { name: string } | null)?.name ?? '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Conducted By">
                    {conductorName ?? '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Started">{formatDate(inspection.started_at)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Completed">{formatDate(inspection.completed_at)}</DetailRow>
                </Column>
                {inspection.submitted_at && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Submitted">{formatDate(inspection.submitted_at)}</DetailRow>
                  </Column>
                )}
              </Grid>
              {inspection.notes && (
                <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                  <DetailRow label="Notes">{inspection.notes}</DetailRow>
                </div>
              )}
            </div>
          </Tile>

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
              {canConduct && (
                <a
                  href={`/inspections/${id}/conduct`}
                  style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
                >
                  Enter responses
                </a>
              )}
            </div>
            {!responses || responses.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  color: '#6f6f6f',
                  fontSize: '0.875rem',
                }}
              >
                No responses recorded yet.{' '}
                {canConduct && (
                  <a
                    href={`/inspections/${id}/conduct`}
                    style={{ color: '#0f62fe', textDecoration: 'none' }}
                  >
                    Conduct the inspection
                  </a>
                )}{' '}
                to start recording answers.
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Question</TableHeader>
                      <TableHeader>Answer</TableHeader>
                      <TableHeader>Status</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {responses.map(r => {
                      const qRaw = r.inspection_template_questions
                      const q = Array.isArray(qRaw) ? qRaw[0] ?? null : qRaw
                      const qText = (q as { question_text: string } | null)?.question_text ?? '—'

                      let answer = '—'
                      if (r.is_na) {
                        answer = 'N/A'
                      } else if (r.response_value) {
                        answer = r.response_value
                      } else if (r.response_numeric != null) {
                        answer = String(r.response_numeric)
                      }

                      return (
                        <TableRow key={r.id}>
                          <TableCell style={{ maxWidth: '300px' }}>
                            <span
                              style={{
                                fontSize: '0.8125rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block',
                              }}
                              title={qText}
                            >
                              {qText}
                            </span>
                          </TableCell>
                          <TableCell style={{ fontSize: '0.8125rem' }}>{answer}</TableCell>
                          <TableCell>
                            {r.is_na ? (
                              <Tag type="gray" size="sm">N/A</Tag>
                            ) : r.is_failed ? (
                              <Tag type="red" size="sm">Failed</Tag>
                            ) : (
                              <Tag type="green" size="sm">Pass</Tag>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Tile>
        </Column>

        {/* Right column */}
        <Column sm={4} md={8} lg={8}>
          {/* Score */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Score
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {scoreNum != null ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 300, color: '#161616' }}>
                      {scoreNum.toFixed(1)}%
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#6f6f6f', alignSelf: 'center' }}>
                      Passing: {passingThreshold}%
                    </span>
                  </div>
                  {/* Score bar */}
                  <div
                    style={{
                      height: '8px',
                      backgroundColor: '#e0e0e0',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '1rem',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(scoreNum, 100)}%`,
                        backgroundColor:
                          scoreNum >= passingThreshold ? '#24a148' : '#da1e28',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <Grid condensed>
                    <Column sm={2} md={2} lg={4}>
                      <DetailRow label="Questions">{inspection.total_questions}</DetailRow>
                    </Column>
                    <Column sm={2} md={2} lg={4}>
                      <DetailRow label="Answered">{inspection.answered_questions}</DetailRow>
                    </Column>
                    <Column sm={2} md={2} lg={4}>
                      <DetailRow label="Failed">
                        <span style={{ color: inspection.failed_questions > 0 ? '#da1e28' : '#161616' }}>
                          {inspection.failed_questions}
                        </span>
                      </DetailRow>
                    </Column>
                    <Column sm={2} md={2} lg={4}>
                      <DetailRow label="Required">{inspection.required_questions}</DetailRow>
                    </Column>
                  </Grid>
                </div>
              ) : (
                <div style={{ padding: '1rem 0' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>
                    Score will be calculated once responses are recorded.
                  </p>
                  {inspection.total_questions > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <Grid condensed>
                        <Column sm={2} md={2} lg={4}>
                          <DetailRow label="Questions">{inspection.total_questions}</DetailRow>
                        </Column>
                        <Column sm={2} md={2} lg={4}>
                          <DetailRow label="Answered">{inspection.answered_questions}</DetailRow>
                        </Column>
                      </Grid>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Tile>

          {/* Linked CAPA actions */}
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
                CAPA Actions
              </h2>
              {inspection.has_open_actions && (
                <Tag type="red" size="sm">Open actions</Tag>
              )}
            </div>
            {!linkedActions || linkedActions.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  color: '#6f6f6f',
                  fontSize: '0.875rem',
                }}
              >
                No CAPA actions linked
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Action #</TableHeader>
                      <TableHeader>Title</TableHeader>
                      <TableHeader>Status</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {linkedActions.map(ia => {
                      const actionRaw = ia.actions
                      const action = Array.isArray(actionRaw) ? actionRaw[0] ?? null : actionRaw
                      if (!action) return null
                      const a = action as {
                        id: string
                        action_number: string | null
                        title: string
                        status: string
                        priority: string
                      }
                      return (
                        <TableRow key={ia.id}>
                          <TableCell>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                              {a.action_number ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell style={{ fontSize: '0.8125rem' }}>
                            <a
                              href={`/actions/${a.id}`}
                              style={{ color: '#0f62fe', textDecoration: 'none' }}
                            >
                              {a.title}
                            </a>
                          </TableCell>
                          <TableCell>
                            <Tag type="blue" size="sm">
                              {a.status?.replace(/_/g, ' ')}
                            </Tag>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Tile>

          {/* Status actions tile */}
          {(canConduct || canSubmit || canCancel) && (
            <Tile style={{ padding: '1.5rem' }}>
              <h2
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#161616',
                  marginBottom: '1rem',
                }}
              >
                Actions
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {canConduct && (
                  <Button kind="primary" href={`/inspections/${id}/conduct`} size="sm">
                    Conduct Inspection
                  </Button>
                )}
                {canSubmit && (
                  <form action={handleSubmit}>
                    <Button type="submit" kind="secondary" size="sm">
                      Submit Inspection
                    </Button>
                  </form>
                )}
                {canCancel && (
                  <form action={handleCancel}>
                    <Button type="submit" kind="danger--ghost" size="sm">
                      Cancel Inspection
                    </Button>
                  </form>
                )}
              </div>
            </Tile>
          )}
        </Column>
      </Grid>
    </div>
  )
}
