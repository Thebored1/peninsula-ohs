import { createClient } from '@/lib/supabase/server'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

const columns: ColDef[] = [
  { key: 'maintenance_number', header: 'Record #' },
  {
    key: 'asset_name',
    header: 'Asset',
    cellConfig: { as: 'field_link', prefix: '/assets/', idField: 'asset_id' },
  },
  { key: 'type_name', header: 'Type' },
  {
    key: 'performed_at',
    header: 'Performed',
    cellConfig: { as: 'date' },
  },
  { key: 'performed_by', header: 'By / Contractor' },
  {
    key: 'total_cost',
    header: 'Cost',
    cellConfig: { as: 'currency' },
  },
  {
    key: 'view',
    header: '',
    cellConfig: { as: 'view_link', prefix: '/maintenance/' },
  },
]

export default async function MaintenancePage() {
  const supabase = await createClient()

  const { data: records } = await supabase
    .from('asset_maintenance_records')
    .select(
      'id, maintenance_number, performed_at, performed_by_name, contractor_company, total_cost, description, next_maintenance_due, assets(id, name, asset_number), maintenance_types(name)'
    )
    .order('performed_at', { ascending: false })

  const rows = (records ?? []).map((rec) => {
    const assetRaw = rec.assets
    const mtRaw = rec.maintenance_types
    const asset = Array.isArray(assetRaw) ? (assetRaw[0] as { id: string; name: string; asset_number: string } | undefined) ?? null : (assetRaw as { id: string; name: string; asset_number: string } | null)
    const mt = Array.isArray(mtRaw) ? (mtRaw[0] as { name: string } | undefined) ?? null : (mtRaw as { name: string } | null)
    return {
      id: rec.id,
      maintenance_number: rec.maintenance_number ?? '—',
      asset_name: asset ? `${asset.name}${asset.asset_number ? ` (${asset.asset_number})` : ''}` : '—',
      asset_id: asset?.id ?? null,
      type_name: mt?.name ?? '—',
      performed_at: rec.performed_at ?? null,
      performed_by: rec.performed_by_name ?? rec.contractor_company ?? '—',
      total_cost: rec.total_cost ?? null,
      next_maintenance_due: rec.next_maintenance_due ?? null,
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
            Maintenance
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} record{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button kind="primary" href="/maintenance/new" style={{ justifyContent: 'center' }}>
          Log Maintenance
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
            No maintenance records
          </div>
        ) : (
          <DataTableClient
            id="maintenance-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search records…"
          />
        )}
      </Tile>
    </div>
  )
}
