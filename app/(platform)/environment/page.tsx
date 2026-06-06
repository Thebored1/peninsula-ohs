import { createClient } from '@/lib/supabase/server'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

const columns: ColDef[] = [
  { key: 'station_name', header: 'Station' },
  { key: 'parameter_name', header: 'Parameter' },
  {
    key: 'category',
    header: 'Category',
    cellConfig: { as: 'transform' },
  },
  { key: 'measured_value', header: 'Value' },
  {
    key: 'measured_at',
    header: 'Measured At',
    cellConfig: { as: 'date' },
  },
  {
    key: 'exceeds_limit',
    header: 'Exceedance',
    cellConfig: {
      as: 'bool_tag',
      trueType: 'red',
      trueLabel: 'Exceeded',
      falseType: 'green',
      falseLabel: 'Within limits',
    },
  },
]

export default async function EnvironmentPage() {
  const supabase = await createClient()

  const { data: records } = await supabase
    .from('env_monitoring_records')
    .select(`
      id, measured_value, measured_at, measurement_method, exceeds_limit,
      env_parameter_types!parameter_type_id(name, monitoring_category),
      env_measurement_units!unit_id(symbol),
      env_monitoring_stations!station_id(name, station_code)
    `)
    .order('measured_at', { ascending: false })

  const rows = (records ?? []).map((r) => {
    const paramRaw = r.env_parameter_types
    const unitRaw = r.env_measurement_units
    const stationRaw = r.env_monitoring_stations
    const param = Array.isArray(paramRaw) ? (paramRaw[0] as { name: string; monitoring_category: string } | undefined) ?? null : (paramRaw as { name: string; monitoring_category: string } | null)
    const unit = Array.isArray(unitRaw) ? (unitRaw[0] as { symbol: string } | undefined) ?? null : (unitRaw as { symbol: string } | null)
    const station = Array.isArray(stationRaw) ? (stationRaw[0] as { name: string; station_code: string } | undefined) ?? null : (stationRaw as { name: string; station_code: string } | null)
    return {
      id: r.id,
      station_name: station ? `${station.name}${station.station_code ? ` (${station.station_code})` : ''}` : 'No station',
      parameter_name: param?.name ?? '—',
      category: param?.monitoring_category ?? '—',
      measured_value: `${r.measured_value}${unit ? ` ${unit.symbol}` : ''}`,
      measured_at: r.measured_at ?? null,
      exceeds_limit: r.exceeds_limit,
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Environmental Monitoring
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} reading{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button kind="primary" href="/environment/new" style={{ justifyContent: 'center' }}>
          Log Reading
        </Button>
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No monitoring records
          </div>
        ) : (
          <DataTableClient
            id="env-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search readings…"
          />
        )}
      </Tile>
    </div>
  )
}
