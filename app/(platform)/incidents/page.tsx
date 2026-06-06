import { createClient } from '@/lib/supabase/server'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function IncidentsPage() {
  const supabase = await createClient()

  const { data: incidents } = await supabase
    .from('incidents')
    .select(
      'id, incident_number, title, status, incident_date, incident_types(name), severity_levels(name, colour_code)'
    )
    .order('created_at', { ascending: false })

  const rows = (incidents ?? []).map((inc) => {
    const typeRaw = inc.incident_types
    const severityRaw = inc.severity_levels
    const type = Array.isArray(typeRaw) ? (typeRaw[0] as { name: string } | undefined) ?? null : (typeRaw as { name: string } | null)
    const severity = Array.isArray(severityRaw) ? (severityRaw[0] as { name: string; colour_code: string } | undefined) ?? null : (severityRaw as { name: string; colour_code: string } | null)
    return {
      id: inc.id,
      incident_number: inc.incident_number ?? '—',
      title: inc.title,
      type_name: type?.name ?? '—',
      severity_name: severity?.name ?? '—',
      severity_colour: severity?.colour_code ?? '#c6c6c6',
      status: inc.status,
      incident_date: inc.incident_date ? formatDate(inc.incident_date) : '—',
    }
  })

  const columns: ColDef[] = [
    { key: 'incident_number', header: 'Incident #' },
    { key: 'title', header: 'Title' },
    { key: 'type_name', header: 'Type' },
    { key: 'severity_name', header: 'Severity', cellConfig: { as: 'dot_text', colourField: 'severity_colour' } },
    { key: 'status', header: 'Status', cellConfig: { as: 'tag', map: { draft: 'gray', cancelled: 'gray', submitted: 'blue', triaged: 'teal', under_investigation: 'purple', capa_in_progress: 'cyan', pending_approval: 'blue', closed: 'green' }, transform: true } },
    { key: 'incident_date', header: 'Date' },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/incidents/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      {/* Page header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.25rem',
            }}
          >
            Incidents
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} incident{rows.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <Button kind="primary" href="/incidents/new" style={{ justifyContent: 'center' }}>Report Incident</Button>
      </div>

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
            No incidents recorded
          </div>
        ) : (
          <DataTableClient
            id="incidents-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search incidents…"
          />
        )}
      </Tile>
    </div>
  )
}
