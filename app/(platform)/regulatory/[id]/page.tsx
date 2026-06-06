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
  Button,
} from '@carbon/react'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    current: 'green',
    superseded: 'gray',
    withdrawn: 'red',
  }
  return map[status] ?? 'gray'
}

function formatDate(iso: string | null) {
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

export default async function RegulatoryDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: standard } = await supabase
    .from('regulatory_standards')
    .select(`
      id, standard_code, title, version, jurisdiction, status,
      effective_date, description, notes, created_at, updated_at,
      regulatory_body_id,
      regulatory_bodies!regulatory_body_id(name, jurisdiction, website_url)
    `)
    .eq('id', id)
    .single()

  if (!standard) notFound()

  const { data: requirements } = await supabase
    .from('regulatory_requirements')
    .select('id, clause_reference, title, description, requirement_type, is_applicable')
    .eq('standard_id', id)
    .order('clause_reference', { ascending: true })

  const bodyRaw = standard.regulatory_bodies
  const body = Array.isArray(bodyRaw)
    ? (bodyRaw[0] as { name: string; jurisdiction: string | null; website_url: string | null } | undefined) ?? null
    : (bodyRaw as { name: string; jurisdiction: string | null; website_url: string | null } | null)

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/regulatory">Regulatory Library</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{standard.standard_code ?? standard.title}</BreadcrumbItem>
      </Breadcrumb>

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
          {standard.standard_code && (
            <p
              style={{
                fontSize: '0.75rem',
                color: '#6f6f6f',
                letterSpacing: '0.32px',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
              }}
            >
              {standard.standard_code}
            </p>
          )}
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.75rem',
            }}
          >
            {standard.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Tag type={statusTag(standard.status ?? 'current')} size="md">
              {(standard.status ?? 'current').replace(/_/g, ' ')}
            </Tag>
            {standard.version && (
              <Tag type="gray" size="md">
                v{standard.version}
              </Tag>
            )}
            {standard.jurisdiction && (
              <Tag type="blue" size="md">
                {standard.jurisdiction}
              </Tag>
            )}
          </div>
        </div>
        <Button kind="ghost" href={`/regulatory/${id}/edit`} size="sm">
          Edit
        </Button>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Standard Code">{standard.standard_code ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Version">{standard.version ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Jurisdiction">{standard.jurisdiction ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Effective Date">{formatDate(standard.effective_date)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Last Updated">{formatDate(standard.updated_at)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Created">{formatDate(standard.created_at)}</DetailRow>
                </Column>
              </Grid>
              {standard.description && (
                <div style={{ marginTop: '0.5rem' }}>
                  <DetailRow label="Description">{standard.description}</DetailRow>
                </div>
              )}
              {standard.notes && (
                <div style={{ marginTop: '0.5rem' }}>
                  <DetailRow label="Notes">{standard.notes}</DetailRow>
                </div>
              )}
            </div>
          </Tile>

          {body && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Regulatory Body</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <DetailRow label="Name">{body.name}</DetailRow>
                {body.jurisdiction && (
                  <DetailRow label="Jurisdiction">{body.jurisdiction}</DetailRow>
                )}
                {body.website_url && (
                  <DetailRow label="Website">
                    <a
                      href={body.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#0f62fe', textDecoration: 'none', fontSize: '0.875rem' }}
                    >
                      {body.website_url}
                    </a>
                  </DetailRow>
                )}
              </div>
            </Tile>
          )}
        </Column>

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
                Requirements ({requirements?.length ?? 0})
              </h2>
            </div>
            {!requirements || requirements.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  color: '#6f6f6f',
                  fontSize: '0.875rem',
                }}
              >
                No requirements recorded
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Clause</TableHeader>
                      <TableHeader>Title</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Applicable</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requirements.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                            {r.clause_reference}
                          </span>
                        </TableCell>
                        <TableCell>{r.title}</TableCell>
                        <TableCell>
                          <Tag
                            type={r.requirement_type === 'shall' ? 'blue' : r.requirement_type === 'should' ? 'teal' : 'gray'}
                            size="sm"
                          >
                            {r.requirement_type ?? '—'}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '2px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: r.is_applicable ? '#defbe6' : '#f4f4f4',
                              color: r.is_applicable ? '#24a148' : '#525252',
                              border: `1px solid ${r.is_applicable ? '#24a148' : '#c6c6c6'}`,
                            }}
                          >
                            {r.is_applicable ? 'Yes' : 'No'}
                          </span>
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
