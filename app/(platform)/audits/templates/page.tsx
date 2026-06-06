import { createClient } from '@/lib/supabase/server'
import {
  Tile, Tag, Button,
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell,
  TableContainer, TableToolbar, TableToolbarContent, TableToolbarSearch,
  Breadcrumb, BreadcrumbItem,
} from '@carbon/react'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AuditTemplatesPage() {
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('audit_templates')
    .select(`id, name, version, is_published, standard_reference, created_at, audit_types(name)`)
    .eq('is_active', true)
    .order('name')

  const rows = (templates ?? []).map(t => {
    const typeRaw = t.audit_types
    const type = Array.isArray(typeRaw) ? typeRaw[0] ?? null : typeRaw
    return {
      id: t.id,
      name: t.name,
      type_name: (type as { name: string } | null)?.name ?? '—',
      version: `v${t.version}`,
      standard_reference: t.standard_reference ?? '—',
      status: t.is_published ? 'published' : 'draft',
      created_at: formatDate(t.created_at),
    }
  })

  const headers = [
    { key: 'name', header: 'Template Name' },
    { key: 'type_name', header: 'Audit Type' },
    { key: 'version', header: 'Version' },
    { key: 'standard_reference', header: 'Standard' },
    { key: 'status', header: 'Status' },
    { key: 'created_at', header: 'Created' },
    { key: 'view', header: '' },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/audits">Audits</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Templates</BreadcrumbItem>
      </Breadcrumb>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Audit Templates</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>{rows.length} template{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <Button kind="primary" href="/audits/templates/new" style={{ justifyContent: 'center' }}>New Template</Button>
      </div>
      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No templates yet.{' '}
            <a href="/audits/templates/new" style={{ color: '#0f62fe', textDecoration: 'none' }}>Create your first audit template</a>.
          </div>
        ) : (
          <DataTable rows={rows} headers={headers}>
            {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps, onInputChange }: any) => (
              <TableContainer>
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch id="audit-templates-search" onChange={onInputChange} placeholder="Search templates…" />
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>{tableHeaders.map((h: any) => <TableHeader key={h.key} {...getHeaderProps({ header: h })}>{h.header}</TableHeader>)}</TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.map((row: any) => (
                      <TableRow key={row.id} {...getRowProps({ row })}>
                        {row.cells.map((cell: any) => {
                          if (cell.info.header === 'status') {
                            return <TableCell key={cell.id}><Tag type={cell.value === 'published' ? 'green' : 'gray'} size="sm">{cell.value}</Tag></TableCell>
                          }
                          if (cell.info.header === 'view') {
                            return <TableCell key={cell.id}><a href={`/audits/templates/${row.id}`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>View</a></TableCell>
                          }
                          return <TableCell key={cell.id}>{cell.value}</TableCell>
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
