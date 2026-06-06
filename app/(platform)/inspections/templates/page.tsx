import { createClient } from '@/lib/supabase/server'
import {
  Tile,
  Tag,
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Breadcrumb,
  BreadcrumbItem,
} from '@carbon/react'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function InspectionTemplatesPage() {
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('inspection_templates')
    .select(`
      id, name, version, is_published, is_active, passing_score_threshold,
      estimated_duration_minutes, created_at,
      inspection_types(name)
    `)
    .eq('is_active', true)
    .order('name')

  const rows = (templates ?? []).map(t => {
    const typeRaw = t.inspection_types
    const type = Array.isArray(typeRaw) ? typeRaw[0] ?? null : typeRaw
    return {
      id: t.id,
      name: t.name,
      type_name: (type as { name: string } | null)?.name ?? '—',
      version: `v${t.version}`,
      passing_score: `${t.passing_score_threshold}%`,
      duration: t.estimated_duration_minutes ? `${t.estimated_duration_minutes} min` : '—',
      status: t.is_published ? 'published' : 'draft',
      created_at: formatDate(t.created_at),
    }
  })

  const headers = [
    { key: 'name', header: 'Template Name' },
    { key: 'type_name', header: 'Type' },
    { key: 'version', header: 'Version' },
    { key: 'passing_score', header: 'Pass Score' },
    { key: 'duration', header: 'Duration' },
    { key: 'status', header: 'Status' },
    { key: 'created_at', header: 'Created' },
    { key: 'view', header: '' },
  ]

  const published = rows.filter(r => r.status === 'published').length
  const drafts = rows.filter(r => r.status === 'draft').length

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/inspections">Inspections</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Templates</BreadcrumbItem>
      </Breadcrumb>

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
            Inspection Templates
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} template{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button kind="primary" href="/inspections/templates/new" style={{ justifyContent: 'center' }}>
          New Template
        </Button>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {published > 0 && <Tag type="green" size="sm">{published} Published</Tag>}
          {drafts > 0 && <Tag type="gray" size="sm">{drafts} Draft</Tag>}
        </div>
      )}

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
            No templates yet.{' '}
            <a
              href="/inspections/templates/new"
              style={{ color: '#0f62fe', textDecoration: 'none' }}
            >
              Create your first template
            </a>{' '}
            to start conducting inspections.
          </div>
        ) : (
          <DataTable rows={rows} headers={headers}>
            {({
              rows: tableRows,
              headers: tableHeaders,
              getTableProps,
              getHeaderProps,
              getRowProps,
              onInputChange,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }: any) => (
              <TableContainer>
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      id="templates-search"
                      onChange={onInputChange}
                      placeholder="Search templates…"
                    />
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {tableHeaders.map((h: any) => (
                        <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                          {h.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {tableRows.map((row: any) => (
                      <TableRow key={row.id} {...getRowProps({ row })}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {row.cells.map((cell: any) => {
                          if (cell.info.header === 'status') {
                            return (
                              <TableCell key={cell.id}>
                                <Tag
                                  type={cell.value === 'published' ? 'green' : 'gray'}
                                  size="sm"
                                >
                                  {cell.value as string}
                                </Tag>
                              </TableCell>
                            )
                          }
                          if (cell.info.header === 'view') {
                            return (
                              <TableCell key={cell.id}>
                                <a
                                  href={`/inspections/templates/${row.id}`}
                                  style={{
                                    fontSize: '0.875rem',
                                    color: '#0f62fe',
                                    textDecoration: 'none',
                                  }}
                                >
                                  View
                                </a>
                              </TableCell>
                            )
                          }
                          return <TableCell key={cell.id}>{cell.value as string}</TableCell>
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}
      </Tile>
    </div>
  )
}
