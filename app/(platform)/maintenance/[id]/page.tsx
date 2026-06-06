import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Tile,
  Breadcrumb,
  BreadcrumbItem,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(val: number | null) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val)
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

export default async function MaintenanceDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: record } = await supabase
    .from('asset_maintenance_records')
    .select(
      `id, maintenance_number, description, findings, notes,
       performed_at, next_maintenance_due, duration_hours,
       performed_by_name, contractor_company,
       parts_cost, labour_cost, total_cost,
       created_at,
       assets(id, name, asset_number),
       maintenance_types(name)`
    )
    .eq('id', id)
    .single()

  if (!record) notFound()

  const { data: parts } = await supabase
    .from('asset_maintenance_parts')
    .select('id, part_name, part_number, quantity, unit, unit_cost, supplier')
    .eq('maintenance_record_id', id)
    .order('created_at', { ascending: true })

  const assetRaw = record.assets
  const mtRaw = record.maintenance_types
  const asset = Array.isArray(assetRaw) ? (assetRaw[0] as { id: string; name: string; asset_number: string } | undefined) ?? null : (assetRaw as { id: string; name: string; asset_number: string } | null)
  const mt = Array.isArray(mtRaw) ? (mtRaw[0] as { name: string } | undefined) ?? null : (mtRaw as { name: string } | null)

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/maintenance">Maintenance</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          {record.maintenance_number ?? id.slice(0, 8)}
        </BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
          {record.maintenance_number ?? '—'}
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.5rem' }}>
          {mt?.name ?? 'Maintenance Record'}
        </h1>
        {asset && (
          <a
            href={`/assets/${asset.id}`}
            style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
          >
            {asset.asset_number ? `${asset.name} (${asset.asset_number})` : asset.name}
          </a>
        )}
      </div>

      <Grid condensed>
        {/* Left */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Work Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Date Performed">{formatDate(record.performed_at)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Duration">
                    {record.duration_hours != null ? `${record.duration_hours} hrs` : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Performed By">{record.performed_by_name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Contractor">{record.contractor_company ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Next Maintenance Due">{formatDate(record.next_maintenance_due)}</DetailRow>
                </Column>
              </Grid>
            </div>
          </Tile>

          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Description</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>
                {record.description || '—'}
              </p>
            </div>
          </Tile>

          {record.findings && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Findings</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{record.findings}</p>
              </div>
            </Tile>
          )}

          {record.notes && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Notes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{record.notes}</p>
              </div>
            </Tile>
          )}
        </Column>

        {/* Right */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Costs</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Parts Cost">{formatCurrency(record.parts_cost)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Labour Cost">{formatCurrency(record.labour_cost)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={16}>
                  <div style={{ marginBottom: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e0e0e0' }}>
                    <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                      Total Cost
                    </p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#161616' }}>
                      {formatCurrency(record.total_cost)}
                    </p>
                  </div>
                </Column>
              </Grid>
            </div>
          </Tile>

          {/* Parts */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Parts Used</h2>
            </div>
            {!parts || parts.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No parts recorded
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Part</TableHeader>
                      <TableHeader>Part #</TableHeader>
                      <TableHeader>Qty</TableHeader>
                      <TableHeader>Unit Cost</TableHeader>
                      <TableHeader>Supplier</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.part_name}</TableCell>
                        <TableCell>{p.part_number ?? '—'}</TableCell>
                        <TableCell>{`${p.quantity}${p.unit ? ` ${p.unit}` : ''}`}</TableCell>
                        <TableCell>{formatCurrency(p.unit_cost)}</TableCell>
                        <TableCell>{p.supplier ?? '—'}</TableCell>
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
