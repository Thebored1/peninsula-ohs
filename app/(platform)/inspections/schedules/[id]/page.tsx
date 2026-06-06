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
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react'
import { toggleScheduleActive, deleteSchedule } from '@/app/actions/inspection-schedules'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    scheduled: 'blue', draft: 'gray', in_progress: 'teal',
    completed: 'cyan', submitted: 'green', cancelled: 'gray',
  }
  return map[status] ?? 'gray'
}

function recurrenceLabel(type: string): string {
  const map: Record<string, string> = {
    once: 'One-time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', custom: 'Custom',
  }
  return map[type] ?? type
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
        {label}
      </p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ScheduleDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: schedule } = await supabase
    .from('inspection_schedules')
    .select(`
      id, name, recurrence_type, next_due_at, last_completed_at, is_active,
      advance_notice_days, overdue_after_hours, created_at,
      inspection_templates(id, name),
      sites(name),
      departments(name)
    `)
    .eq('id', id)
    .single()

  if (!schedule) notFound()

  // Assigned user
  const { data: scheduleRaw } = await supabase
    .from('inspection_schedules')
    .select('assigned_to')
    .eq('id', id)
    .single()

  let assigneeName: string | null = null
  if (scheduleRaw?.assigned_to) {
    const { data: assignee } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', scheduleRaw.assigned_to)
      .single()
    if (assignee) assigneeName = `${assignee.first_name} ${assignee.last_name}`
  }

  // Recent inspections from this schedule
  const { data: inspections } = await supabase
    .from('inspections')
    .select('id, inspection_number, status, result, score, created_at')
    .eq('schedule_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const tplRaw = schedule.inspection_templates
  const siteRaw = schedule.sites
  const deptRaw = schedule.departments
  const tpl = Array.isArray(tplRaw) ? tplRaw[0] ?? null : tplRaw
  const site = Array.isArray(siteRaw) ? siteRaw[0] ?? null : siteRaw
  const dept = Array.isArray(deptRaw) ? deptRaw[0] ?? null : deptRaw

  const isOverdue = schedule.is_active &&
    schedule.next_due_at &&
    new Date(schedule.next_due_at) < new Date()

  async function handleToggle() {
    'use server'
    if (!schedule) return
    await toggleScheduleActive(id, !schedule.is_active)
  }

  async function handleDelete() {
    'use server'
    await deleteSchedule(id)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/inspections">Inspections</BreadcrumbItem>
        <BreadcrumbItem href="/inspections/schedules">Schedules</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{schedule.name}</BreadcrumbItem>
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>
            {schedule.name}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Tag type={schedule.is_active ? 'green' : 'gray'} size="md">
              {schedule.is_active ? 'Active' : 'Paused'}
            </Tag>
            <Tag type="blue" size="md">
              {recurrenceLabel(schedule.recurrence_type)}
            </Tag>
            {isOverdue && <Tag type="red" size="md">Overdue</Tag>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <form action={handleToggle}>
            <Button type="submit" kind={schedule.is_active ? 'secondary' : 'primary'} size="sm">
              {schedule.is_active ? 'Pause Schedule' : 'Activate Schedule'}
            </Button>
          </form>
          {(inspections ?? []).length === 0 && (
            <form action={handleDelete}>
              <Button type="submit" kind="danger--ghost" size="sm">
                Delete
              </Button>
            </form>
          )}
        </div>
      </div>

      <Grid condensed>
        {/* Left: details */}
        <Column sm={4} md={4} lg={6}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Schedule Details
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <DetailRow label="Template">
                {(tpl as { id: string; name: string } | null) ? (
                  <a
                    href={`/inspections/templates/${(tpl as { id: string }).id}`}
                    style={{ color: '#0f62fe', textDecoration: 'none' }}
                  >
                    {(tpl as { name: string }).name}
                  </a>
                ) : '—'}
              </DetailRow>
              <DetailRow label="Site">
                {(site as { name: string } | null)?.name ?? '—'}
              </DetailRow>
              <DetailRow label="Department">
                {(dept as { name: string } | null)?.name ?? '—'}
              </DetailRow>
              <DetailRow label="Assigned To">{assigneeName ?? 'Unassigned'}</DetailRow>
              <DetailRow label="Recurrence">{recurrenceLabel(schedule.recurrence_type)}</DetailRow>
              <DetailRow label="Next Due">
                <span style={{ color: isOverdue ? '#da1e28' : '#161616' }}>
                  {formatDate(schedule.next_due_at)}
                </span>
              </DetailRow>
              <DetailRow label="Last Completed">{formatDate(schedule.last_completed_at)}</DetailRow>
              <DetailRow label="Advance Notice">{schedule.advance_notice_days} day{schedule.advance_notice_days !== 1 ? 's' : ''}</DetailRow>
              <DetailRow label="Overdue After">{schedule.overdue_after_hours} hour{schedule.overdue_after_hours !== 1 ? 's' : ''}</DetailRow>
            </div>
          </Tile>
        </Column>

        {/* Right: inspections generated */}
        <Column sm={4} md={4} lg={10}>
          <Tile style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Generated Inspections
              </h2>
            </div>
            {!inspections || inspections.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  color: '#6f6f6f',
                  fontSize: '0.875rem',
                }}
              >
                No inspections generated yet
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Inspection #</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Result</TableHeader>
                      <TableHeader>Score</TableHeader>
                      <TableHeader>Created</TableHeader>
                      <TableHeader></TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inspections.map(insp => (
                      <TableRow key={insp.id}>
                        <TableCell>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                            {insp.inspection_number ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Tag type={statusTag(insp.status)} size="sm">
                            {insp.status?.replace(/_/g, ' ')}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          {insp.result ? (
                            <Tag
                              type={
                                ({ pass: 'green', conditional_pass: 'teal', fail: 'red' } as Record<string, TagType>)[insp.result] ?? 'gray'
                              }
                              size="sm"
                            >
                              {insp.result.replace(/_/g, ' ')}
                            </Tag>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {insp.score != null ? `${Number(insp.score).toFixed(1)}%` : '—'}
                        </TableCell>
                        <TableCell style={{ fontSize: '0.8125rem' }}>
                          {new Date(insp.created_at).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          <a
                            href={`/inspections/${insp.id}`}
                            style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
                          >
                            View
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
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
