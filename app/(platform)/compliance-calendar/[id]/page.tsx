import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Tile,
  Tag,
  Breadcrumb,
  BreadcrumbItem,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    active: 'green',
    inactive: 'gray',
    superseded: 'magenta',
  }
  return map[status] ?? 'gray'
}

function taskStatusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    pending: 'gray',
    in_progress: 'blue',
    completed: 'green',
    overdue: 'red',
    cancelled: 'gray',
  }
  return map[status] ?? 'gray'
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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

export default async function ComplianceCalendarDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: obligation } = await supabase
    .from('compliance_obligations')
    .select(
      `id, title, description, regulatory_body, standard_reference,
       frequency, next_due_date, status, is_critical,
       created_at, updated_at,
       compliance_obligation_types(name, colour_code),
       owner:owner_id(first_name, last_name, email)`
    )
    .eq('id', id)
    .single()

  if (!obligation) notFound()

  const { data: tasks } = await supabase
    .from('compliance_tasks')
    .select('id, task_number, title, due_date, status, assigned_to')
    .eq('obligation_id', id)
    .order('due_date', { ascending: true })

  // Gather assignee ids to resolve names
  const assigneeIds = [...new Set((tasks ?? []).map((t) => t.assigned_to).filter(Boolean))]
  let assigneeMap: Record<string, string> = {}
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .in('id', assigneeIds as string[])
    for (const p of profiles ?? []) {
      assigneeMap[p.id] = `${p.first_name} ${p.last_name}`
    }
  }

  const typeRaw = obligation.compliance_obligation_types
  const obligationType = Array.isArray(typeRaw)
    ? (typeRaw[0] as { name: string; colour_code: string } | undefined) ?? null
    : (typeRaw as { name: string; colour_code: string } | null)

  const ownerRaw = (obligation as Record<string, unknown>).owner
  const owner = Array.isArray(ownerRaw)
    ? (ownerRaw[0] as { first_name: string; last_name: string; email: string } | undefined) ?? null
    : (ownerRaw as { first_name: string; last_name: string; email: string } | null)

  return (
    <div style={{ padding: '2rem' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/compliance-calendar">Compliance Calendar</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{obligation.title}</BreadcrumbItem>
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
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.75rem',
            }}
          >
            {obligation.title}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Tag type={statusTag(obligation.status)} size="md">
              {obligation.status?.replace(/_/g, ' ')}
            </Tag>
            {obligation.is_critical && (
              <Tag type="red" size="md">
                Critical
              </Tag>
            )}
            {obligationType && (
              <Tag type="blue" size="md">
                {obligationType.name}
              </Tag>
            )}
          </div>
        </div>
      </div>

      <Grid condensed>
        {/* Left column — obligation details */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Obligation Details
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Regulatory Body">
                    {obligation.regulatory_body ?? '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Standard / Reference">
                    {obligation.standard_reference ?? '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Frequency">
                    {obligation.frequency ? obligation.frequency.replace(/_/g, ' ') : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Next Due Date">
                    <span
                      style={(() => {
                        if (!obligation.next_due_date) return {}
                        const days = Math.floor(
                          (new Date(obligation.next_due_date).getTime() - Date.now()) / 86400000
                        )
                        if (days < 0) return { color: '#da1e28', fontWeight: 600 }
                        if (days <= 14) return { color: '#f1620a', fontWeight: 600 }
                        return {}
                      })()}
                    >
                      {formatDate(obligation.next_due_date)}
                    </span>
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Owner">
                    {owner
                      ? `${owner.first_name} ${owner.last_name}`
                      : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Critical">
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '2px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: obligation.is_critical ? '#fff1f1' : '#f4f4f4',
                        color: obligation.is_critical ? '#da1e28' : '#525252',
                        border: `1px solid ${obligation.is_critical ? '#da1e28' : '#c6c6c6'}`,
                      }}
                    >
                      {obligation.is_critical ? 'Yes' : 'No'}
                    </span>
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Created">
                    {formatDate(obligation.created_at)}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Last Updated">
                    {formatDate(obligation.updated_at)}
                  </DetailRow>
                </Column>
              </Grid>
            </div>
          </Tile>

          {obligation.description && (
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
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>
                  {obligation.description}
                </p>
              </div>
            </Tile>
          )}
        </Column>

        {/* Right column — compliance tasks */}
        <Column sm={4} md={8} lg={8}>
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
                Compliance Tasks
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#6f6f6f',
                  background: '#f4f4f4',
                  borderRadius: '2px',
                  padding: '0.125rem 0.5rem',
                }}
              >
                {(tasks ?? []).length} task{(tasks ?? []).length !== 1 ? 's' : ''}
              </span>
            </div>
            {!tasks || tasks.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  color: '#6f6f6f',
                  fontSize: '0.875rem',
                }}
              >
                No tasks generated for this obligation yet
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Task #</TableHeader>
                      <TableHeader>Title</TableHeader>
                      <TableHeader>Due Date</TableHeader>
                      <TableHeader>Assigned To</TableHeader>
                      <TableHeader>Status</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tasks.map((task) => {
                      const dueDate = task.due_date ? new Date(task.due_date) : null
                      const daysUntilDue = dueDate
                        ? Math.floor((dueDate.getTime() - Date.now()) / 86400000)
                        : null
                      const dueDateStyle: React.CSSProperties =
                        daysUntilDue !== null && daysUntilDue < 0
                          ? { color: '#da1e28', fontWeight: 600 }
                          : daysUntilDue !== null && daysUntilDue <= 14
                          ? { color: '#f1620a', fontWeight: 600 }
                          : {}

                      return (
                        <TableRow key={task.id}>
                          <TableCell>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.8125rem',
                              }}
                            >
                              {task.task_number ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell>{task.title}</TableCell>
                          <TableCell>
                            <span style={dueDateStyle}>
                              {formatDate(task.due_date)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {task.assigned_to
                              ? assigneeMap[task.assigned_to] ?? '—'
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Tag type={taskStatusTag(task.status)} size="sm">
                              {task.status?.replace(/_/g, ' ')}
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
        </Column>
      </Grid>
    </div>
  )
}
