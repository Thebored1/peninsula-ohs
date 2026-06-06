import { createClient } from '@/lib/supabase/server'
import {
  Tile, Tag, Button,
} from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AuditsPage() {
  const supabase = await createClient()

  const { data: audits } = await supabase
    .from('audits')
    .select(`
      id, audit_number, title, status, planned_start_date, planned_end_date,
      total_criteria, assessed_criteria, major_nc_count, minor_nc_count,
      audit_types(name)
    `)
    .order('created_at', { ascending: false })

  const rows = (audits ?? []).map(a => {
    const typeRaw = a.audit_types
    const type = Array.isArray(typeRaw) ? typeRaw[0] ?? null : typeRaw
    return {
      id: a.id,
      audit_number: a.audit_number ?? '—',
      title: a.title,
      type_name: (type as { name: string } | null)?.name ?? '—',
      status: a.status,
      planned_start_date: formatDate(a.planned_start_date),
      planned_end_date: formatDate(a.planned_end_date),
      major_nc: a.major_nc_count,
      minor_nc: a.minor_nc_count,
    }
  })

  const columns: ColDef[] = [
    { key: 'audit_number', header: 'Audit #', cellConfig: { as: 'monospace' } },
    { key: 'title', header: 'Title' },
    { key: 'type_name', header: 'Type' },
    { key: 'status', header: 'Status', cellConfig: { as: 'tag', map: { planned: 'blue', in_progress: 'teal', findings_review: 'purple', report_draft: 'cyan', completed: 'green', cancelled: 'gray' }, transform: true } },
    { key: 'planned_start_date', header: 'Start' },
    { key: 'planned_end_date', header: 'End' },
    { key: 'major_nc', header: 'Major NC', cellConfig: { as: 'number_alert', color: '#da1e28' } },
    { key: 'minor_nc', header: 'Minor NC', cellConfig: { as: 'number_alert', color: '#f1c21b' } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/audits/' } },
  ]

  const planned = rows.filter(r => r.status === 'planned').length
  const inProgress = rows.filter(r => r.status === 'in_progress').length
  const completed = rows.filter(r => r.status === 'completed').length
  const withMajorNCs = rows.filter(r => r.major_nc > 0).length

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Audits
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} audit{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button kind="ghost" href="/audits/templates" size="sm">Templates</Button>
          <Button kind="primary" href="/audits/new" style={{ justifyContent: 'center' }}>Schedule Audit</Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {planned > 0 && <Tag type="blue" size="sm">{planned} Planned</Tag>}
          {inProgress > 0 && <Tag type="teal" size="sm">{inProgress} In Progress</Tag>}
          {completed > 0 && <Tag type="green" size="sm">{completed} Completed</Tag>}
          {withMajorNCs > 0 && <Tag type="red" size="sm">{withMajorNCs} with Major NCs</Tag>}
        </div>
      )}

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No audits scheduled.{' '}
            <a href="/audits/new" style={{ color: '#0f62fe', textDecoration: 'none' }}>Schedule an audit</a>.
          </div>
        ) : (
          <DataTableClient id="audits-search" rows={rows} columns={columns} searchPlaceholder="Search audits…" />
        )}
      </Tile>
    </div>
  )
}
