import { createClient } from '@/lib/supabase/server'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

const columns: ColDef[] = [
  { key: 'asset_number', header: 'Asset #' },
  { key: 'name', header: 'Name' },
  { key: 'type_name', header: 'Type' },
  {
    key: 'status_name',
    header: 'Status',
    cellConfig: { as: 'dot_tag', colourField: 'status_colour', isOpField: 'is_operational' },
  },
  { key: 'location_details', header: 'Location' },
  {
    key: 'next_maintenance_due',
    header: 'Next Maintenance',
    cellConfig: { as: 'due_date' },
  },
  {
    key: 'next_inspection_due',
    header: 'Next Inspection',
    cellConfig: { as: 'due_date' },
  },
  {
    key: 'risk_classification',
    header: 'Risk',
    cellConfig: { as: 'risk_pill' },
  },
  {
    key: 'view',
    header: '',
    cellConfig: { as: 'view_link', prefix: '/assets/' },
  },
]

export default async function AssetsPage() {
  const supabase = await createClient()

  const { data: assets } = await supabase
    .from('assets')
    .select(
      'id, asset_number, name, location_details, next_maintenance_due, next_inspection_due, risk_classification, asset_types(name), asset_statuses(name, colour_code, is_operational)'
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const rows = (assets ?? []).map((a) => {
    const typeRaw = a.asset_types
    const statusRaw = a.asset_statuses
    const type = Array.isArray(typeRaw)
      ? (typeRaw[0] as { name: string } | undefined) ?? null
      : (typeRaw as { name: string } | null)
    const status = Array.isArray(statusRaw)
      ? (statusRaw[0] as { name: string; colour_code: string; is_operational: boolean } | undefined) ?? null
      : (statusRaw as { name: string; colour_code: string; is_operational: boolean } | null)
    return {
      id: a.id,
      asset_number: a.asset_number ?? '—',
      name: a.name,
      type_name: type?.name ?? '—',
      status_name: status?.name ?? '—',
      status_colour: status?.colour_code ?? '#c6c6c6',
      is_operational: status?.is_operational ?? true,
      location_details: a.location_details ?? '—',
      next_maintenance_due: a.next_maintenance_due ?? null,
      next_inspection_due: a.next_inspection_due ?? null,
      risk_classification: a.risk_classification ?? 'low',
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Asset Register
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} asset{rows.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Button kind="primary" href="/assets/new" style={{ justifyContent: 'center' }}>
          Add Asset
        </Button>
      </div>

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
            No assets registered
          </div>
        ) : (
          <DataTableClient
            id="assets-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search assets…"
          />
        )}
      </Tile>
    </div>
  )
}
