import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem,
  Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer,
} from '@carbon/react'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{label}</p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps { params: Promise<{ id: string }> }

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select(`
      id, document_number, title, description, version, review_due_date, created_at,
      document_types!document_type_id(name),
      document_statuses!status_id(name, colour_code, is_live)
    `)
    .eq('id', id)
    .single()

  if (!doc) notFound()

  const { data: versions } = await supabase
    .from('document_versions')
    .select('id, version_number, created_at, change_summary')
    .eq('document_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const typeRaw = doc.document_types
  const statusRaw = doc.document_statuses
  const type = Array.isArray(typeRaw) ? (typeRaw[0] as { name: string } | undefined) ?? null : (typeRaw as { name: string } | null)
  const status = Array.isArray(statusRaw)
    ? (statusRaw[0] as { name: string; colour_code: string; is_live: boolean } | undefined) ?? null
    : (statusRaw as { name: string; colour_code: string; is_live: boolean } | null)

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/documents">Documents</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{doc.document_number ?? doc.title}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
        {doc.document_number && (
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            {doc.document_number}
          </p>
        )}
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>{doc.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {status && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: status.colour_code }} />
              <Tag type={status.is_live ? 'green' : 'gray'} size="md">{status.name}</Tag>
            </div>
          )}
          <Tag type="gray" size="md">v{doc.version ?? '1.0'}</Tag>
        </div>
        </div>
        <a href={`/documents/${id}/edit`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none', marginTop: '0.5rem' }}>
          Edit
        </a>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}><DetailRow label="Type">{type?.name ?? '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Version">{doc.version ?? '1.0'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Review Due">{formatDate(doc.review_due_date)}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Created">{formatDate(doc.created_at)}</DetailRow></Column>
              </Grid>
              {doc.description && (
                <div style={{ marginTop: '0.5rem' }}>
                  <DetailRow label="Description">{doc.description}</DetailRow>
                </div>
              )}
            </div>
          </Tile>
        </Column>

        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Version History</h2>
            </div>
            {!versions || versions.length === 0 ? (
              <div style={{ padding: '1.5rem', fontSize: '0.875rem', color: '#6f6f6f', textAlign: 'center' }}>
                No version history
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Version</TableHeader>
                      <TableHeader>Date</TableHeader>
                      <TableHeader>Changes</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {versions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>{v.version_number ?? '—'}</TableCell>
                        <TableCell>{formatDate(v.created_at)}</TableCell>
                        <TableCell>{v.change_summary ?? '—'}</TableCell>
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
