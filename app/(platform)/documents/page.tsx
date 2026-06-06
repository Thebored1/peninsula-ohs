import { createClient } from '@/lib/supabase/server'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

const columns: ColDef[] = [
  { key: 'document_number', header: 'Doc #' },
  { key: 'title', header: 'Title' },
  { key: 'type_name', header: 'Type' },
  {
    key: 'status_name',
    header: 'Status',
    cellConfig: { as: 'dot_text', colourField: 'status_colour' },
  },
  { key: 'version', header: 'Version' },
  {
    key: 'review_due_date',
    header: 'Review Due',
    cellConfig: { as: 'due_date' },
  },
  {
    key: 'view',
    header: '',
    cellConfig: { as: 'view_link', prefix: '/documents/' },
  },
]

export default async function DocumentsPage() {
  const supabase = await createClient()

  const { data: docs } = await supabase
    .from('documents')
    .select(`
      id, title, document_number, version, review_due_date, created_at,
      document_types!document_type_id(name),
      document_statuses!status_id(name, colour_code)
    `)
    .order('created_at', { ascending: false })

  const rows = (docs ?? []).map((d) => {
    const typeRaw = d.document_types
    const statusRaw = d.document_statuses
    const type = Array.isArray(typeRaw) ? (typeRaw[0] as { name: string } | undefined) ?? null : (typeRaw as { name: string } | null)
    const status = Array.isArray(statusRaw) ? (statusRaw[0] as { name: string; colour_code: string } | undefined) ?? null : (statusRaw as { name: string; colour_code: string } | null)
    return {
      id: d.id,
      document_number: d.document_number ?? '—',
      title: d.title,
      type_name: type?.name ?? '—',
      status_name: status?.name ?? '—',
      status_colour: status?.colour_code ?? '#c6c6c6',
      version: d.version ?? '—',
      review_due_date: d.review_due_date ?? null,
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Documents
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} document{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button kind="primary" href="/documents/new" style={{ justifyContent: 'center' }}>
          Add Document
        </Button>
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No documents
          </div>
        ) : (
          <DataTableClient
            id="docs-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search documents…"
          />
        )}
      </Tile>
    </div>
  )
}
