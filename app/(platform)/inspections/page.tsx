import { createClient } from '@/lib/supabase/server'
import {
  Tile,
  Tag,
  Button,
} from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function InspectionsPage() {
  const supabase = await createClient()

  const { data: inspections } = await supabase
    .from('inspections')
    .select(`
      id, inspection_number, status, result, score, created_at, is_overdue,
      inspection_types(name),
      inspection_templates(name)
    `)
    .order('created_at', { ascending: false })

  const rows = (inspections ?? []).map(insp => {
    const typeRaw = insp.inspection_types
    const tplRaw = insp.inspection_templates
    const type = Array.isArray(typeRaw) ? typeRaw[0] ?? null : typeRaw
    const tpl = Array.isArray(tplRaw) ? tplRaw[0] ?? null : tplRaw
    return {
      id: insp.id,
      inspection_number: insp.inspection_number ?? '—',
      template_name: (tpl as { name: string } | null)?.name ?? '—',
      type_name: (type as { name: string } | null)?.name ?? '—',
      status: insp.status,
      result: insp.result ?? null,
      score: insp.score != null ? `${Number(insp.score).toFixed(1)}%` : '—',
      created_at: formatDate(insp.created_at),
      is_overdue: insp.is_overdue,
    }
  })

  const columns: ColDef[] = [
    { key: 'inspection_number', header: 'Inspection #', cellConfig: { as: 'monospace_flag', flagField: 'is_overdue', flagLabel: 'Overdue', flagType: 'red' } },
    { key: 'template_name', header: 'Template' },
    { key: 'type_name', header: 'Type' },
    { key: 'status', header: 'Status', cellConfig: { as: 'tag', map: { scheduled: 'blue', draft: 'gray', in_progress: 'teal', completed: 'cyan', submitted: 'green', cancelled: 'gray' }, transform: true } },
    { key: 'result', header: 'Result', cellConfig: { as: 'tag', map: { pass: 'green', conditional_pass: 'teal', fail: 'red' }, default: 'gray', transform: true } },
    { key: 'score', header: 'Score' },
    { key: 'created_at', header: 'Created' },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/inspections/' } },
  ]

  const scheduled = rows.filter(r => r.status === 'scheduled').length
  const inProgress = rows.filter(r => ['draft', 'in_progress'].includes(r.status)).length
  const submitted = rows.filter(r => r.status === 'submitted').length
  const overdue = rows.filter(r => r.is_overdue).length

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Inspections
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} inspection{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button kind="ghost" href="/inspections/templates" size="sm">
            Templates
          </Button>
          <Button kind="ghost" href="/inspections/schedules" size="sm">
            Schedules
          </Button>
          <Button kind="primary" href="/inspections/new" style={{ justifyContent: 'center' }}>
            Start Inspection
          </Button>
        </div>
      </div>

      {/* Stat pills */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {scheduled > 0 && <Tag type="blue" size="sm">{scheduled} Scheduled</Tag>}
          {inProgress > 0 && <Tag type="teal" size="sm">{inProgress} In Progress</Tag>}
          {submitted > 0 && <Tag type="green" size="sm">{submitted} Submitted</Tag>}
          {overdue > 0 && <Tag type="red" size="sm">{overdue} Overdue</Tag>}
        </div>
      )}

      {/* Table */}
      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              color: '#6f6f6f',
              fontSize: '0.875rem',
            }}
          >
            No inspections recorded.{' '}
            <a href="/inspections/new" style={{ color: '#0f62fe', textDecoration: 'none' }}>
              Start an inspection
            </a>{' '}
            or{' '}
            <a href="/inspections/templates" style={{ color: '#0f62fe', textDecoration: 'none' }}>
              create a template
            </a>{' '}
            first.
          </div>
        ) : (
          <DataTableClient id="inspections-search" rows={rows} columns={columns} searchPlaceholder="Search inspections…" />
        )}
      </Tile>
    </div>
  )
}
