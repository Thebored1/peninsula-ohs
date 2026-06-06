import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Tile,
  Tag,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

function statusTag(isOperational: boolean): TagType {
  return isOperational ? 'green' : 'red'
}

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

function dueBadge(iso: string | null) {
  if (!iso) return null
  const days = Math.floor((new Date(iso).getTime() - Date.now()) / 86400000)
  if (days < 0) return <span style={{ color: '#da1e28', fontWeight: 600, fontSize: '0.75rem' }}>OVERDUE</span>
  if (days <= 14) return <span style={{ color: '#f1620a', fontWeight: 600, fontSize: '0.75rem' }}>DUE SOON</span>
  return null
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

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: asset } = await supabase
    .from('assets')
    .select(
      `id, asset_number, name, description, serial_number, asset_tag,
       manufacturer, model, year_of_manufacture, location_details,
       purchase_date, warranty_expiry_date, replacement_cost,
       inspection_frequency, next_inspection_due, last_inspected_at,
       next_maintenance_due, last_maintained_at,
       is_active, notes, created_at,
       asset_types(name),
       asset_statuses(name, colour_code, is_operational)`
    )
    .eq('id', id)
    .single()

  if (!asset) notFound()

  // Maintenance history
  const { data: maintenanceRecords } = await supabase
    .from('asset_maintenance_records')
    .select('id, maintenance_number, performed_at, performed_by_name, total_cost, description, maintenance_types(name)')
    .eq('asset_id', id)
    .order('performed_at', { ascending: false })
    .limit(10)

  const typeRaw = asset.asset_types
  const statusRaw = asset.asset_statuses
  const type = Array.isArray(typeRaw) ? (typeRaw[0] as { name: string } | undefined) ?? null : (typeRaw as { name: string } | null)
  const status = Array.isArray(statusRaw)
    ? (statusRaw[0] as { name: string; colour_code: string; is_operational: boolean } | undefined) ?? null
    : (statusRaw as { name: string; colour_code: string; is_operational: boolean } | null)

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/assets">Asset Register</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          {asset.asset_number ?? id.slice(0, 8)}
        </BreadcrumbItem>
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
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            {asset.asset_number ?? '—'}
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>
            {asset.name}
          </h1>
          {status && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: status.colour_code,
                  flexShrink: 0,
                }}
              />
              <Tag type={statusTag(status.is_operational)} size="md">
                {status.name}
              </Tag>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button kind="ghost" href={`/assets/${id}/edit`} size="sm">Edit</Button>
          <Button kind="primary" href={`/maintenance/new?asset_id=${id}`} size="sm">Log Maintenance</Button>
        </div>
      </div>

      <Grid condensed>
        {/* Left column */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Asset Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Type">{type?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Manufacturer">{asset.manufacturer ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Model">{asset.model ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Year">{asset.year_of_manufacture ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Serial Number">{asset.serial_number ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Asset Tag">{asset.asset_tag ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Location">{asset.location_details ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Registered">{formatDate(asset.created_at)}</DetailRow>
                </Column>
              </Grid>
            </div>
          </Tile>

          {asset.description && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Description</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{asset.description}</p>
              </div>
            </Tile>
          )}

          {asset.notes && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Notes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{asset.notes}</p>
              </div>
            </Tile>
          )}
        </Column>

        {/* Right column */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Maintenance Schedule</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Last Maintained">{formatDate(asset.last_maintained_at)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Next Maintenance Due">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{formatDate(asset.next_maintenance_due)}</span>
                      {dueBadge(asset.next_maintenance_due)}
                    </div>
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Last Inspected">{formatDate(asset.last_inspected_at)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Next Inspection Due">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{formatDate(asset.next_inspection_due)}</span>
                      {dueBadge(asset.next_inspection_due)}
                    </div>
                  </DetailRow>
                </Column>
                {asset.inspection_frequency && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Inspection Frequency">
                      {asset.inspection_frequency.replace(/_/g, ' ')}
                    </DetailRow>
                  </Column>
                )}
              </Grid>
            </div>
          </Tile>

          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Commercial</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Purchase Date">{formatDate(asset.purchase_date)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Warranty Expiry">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{formatDate(asset.warranty_expiry_date)}</span>
                      {dueBadge(asset.warranty_expiry_date)}
                    </div>
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Replacement Cost">{formatCurrency(asset.replacement_cost)}</DetailRow>
                </Column>
              </Grid>
            </div>
          </Tile>
        </Column>

        {/* Maintenance history — full width */}
        <Column sm={4} md={8} lg={16}>
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
                Maintenance History
              </h2>
              <a
                href={`/maintenance/new?asset_id=${id}`}
                style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
              >
                + Log maintenance
              </a>
            </div>
            {!maintenanceRecords || maintenanceRecords.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No maintenance records
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Record #</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Performed</TableHeader>
                      <TableHeader>By</TableHeader>
                      <TableHeader>Cost</TableHeader>
                      <TableHeader></TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {maintenanceRecords.map((rec) => {
                      const mtRaw = rec.maintenance_types
                      const mt = Array.isArray(mtRaw) ? (mtRaw[0] as { name: string } | undefined) ?? null : (mtRaw as { name: string } | null)
                      return (
                        <TableRow key={rec.id}>
                          <TableCell>{rec.maintenance_number ?? '—'}</TableCell>
                          <TableCell>{mt?.name ?? '—'}</TableCell>
                          <TableCell>{formatDate(rec.performed_at)}</TableCell>
                          <TableCell>{rec.performed_by_name ?? '—'}</TableCell>
                          <TableCell>{formatCurrency(rec.total_cost)}</TableCell>
                          <TableCell>
                            <a
                              href={`/maintenance/${rec.id}`}
                              style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
                            >
                              View
                            </a>
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
