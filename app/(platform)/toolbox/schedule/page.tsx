import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Breadcrumb, BreadcrumbItem, Tag } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

export default async function ToolboxSchedulePage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('toolbox_talk_schedules')
    .select(`
      id, title, scheduled_date, status, created_at,
      toolbox_talk_templates(title),
      sites(name),
      user_profiles!toolbox_talk_schedules_assigned_to_fkey(first_name, last_name)
    `)
    .eq('organisation_id', orgId)
    .order('scheduled_date', { ascending: true })

  const today = new Date().toISOString().slice(0, 10)

  const rows = (data ?? []).map(r => {
    const siteRaw = r.sites
    const site = Array.isArray(siteRaw)
      ? (siteRaw[0] as { name: string } | undefined)
      : (siteRaw as { name: string } | null)
    const assigneeRaw = r.user_profiles
    const assignee = Array.isArray(assigneeRaw)
      ? (assigneeRaw[0] as { first_name: string; last_name: string } | undefined)
      : (assigneeRaw as { first_name: string; last_name: string } | null)
    const templateRaw = r.toolbox_talk_templates
    const template = Array.isArray(templateRaw)
      ? (templateRaw[0] as { title: string } | undefined)
      : (templateRaw as { title: string } | null)

    // Auto-flag overdue
    let status = r.status
    if (status === 'pending' && r.scheduled_date < today) {
      status = 'overdue'
    }

    return {
      id: r.id,
      title: r.title,
      template: template?.title ?? '—',
      site: site?.name ?? '—',
      assigned_to: assignee ? `${assignee.first_name} ${assignee.last_name}` : '—',
      scheduled_date: r.scheduled_date,
      status,
    }
  })

  const statusTagMap: Record<string, 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'> = {
    pending: 'blue',
    completed: 'green',
    overdue: 'red',
    cancelled: 'gray',
  }

  const columns: ColDef[] = [
    { key: 'title', header: 'Title' },
    { key: 'template', header: 'Template' },
    { key: 'site', header: 'Site' },
    { key: 'assigned_to', header: 'Assigned To' },
    { key: 'scheduled_date', header: 'Scheduled Date', cellConfig: { as: 'due_date' } },
    {
      key: 'status',
      header: 'Status',
      cellConfig: { as: 'tag', map: statusTagMap, transform: true },
    },
  ]

  const pending = rows.filter(r => r.status === 'pending').length
  const overdue = rows.filter(r => r.status === 'overdue').length
  const completed = rows.filter(r => r.status === 'completed').length

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.25rem' }}>
        <BreadcrumbItem href="/toolbox">Toolbox Talks</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Schedule</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Talk Schedule
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} scheduled talk{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NewButton href="/toolbox/schedule/new" label="Schedule Talk" />
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {overdue > 0 && <Tag type="red" size="sm">{overdue} Overdue</Tag>}
          {pending > 0 && <Tag type="blue" size="sm">{pending} Pending</Tag>}
          {completed > 0 && <Tag type="green" size="sm">{completed} Completed</Tag>}
        </div>
      )}

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No talks scheduled.{' '}
            <a href="/toolbox/schedule/new" style={{ color: '#0f62fe', textDecoration: 'none' }}>
              Schedule the first talk
            </a>.
          </div>
        ) : (
          <DataTableClient
            id="schedule-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search schedule…"
          />
        )}
      </Tile>
    </div>
  )
}
