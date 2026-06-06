import { createClient } from '@/lib/supabase/server'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

const columns: ColDef[] = [
  { key: 'check_number', header: 'Check #' },
  { key: 'worker_name', header: 'Worker' },
  { key: 'surveillance_type', header: 'Surveillance Type' },
  {
    key: 'check_date',
    header: 'Check Date',
    cellConfig: { as: 'date' },
  },
  {
    key: 'result',
    header: 'Result',
    cellConfig: {
      as: 'tag',
      map: {
        fit: 'green',
        fit_with_restrictions: 'teal',
        temporarily_unfit: 'red',
        refer_specialist: 'red',
        pending: 'gray',
        not_completed: 'gray',
      },
      transform: true,
    },
  },
  { key: 'provider_name', header: 'Provider' },
  {
    key: 'next_check_due',
    header: 'Next Due',
    cellConfig: { as: 'date' },
  },
]

export default async function HealthPage() {
  const supabase = await createClient()

  const { data: records } = await supabase
    .from('health_check_records')
    .select(`
      id, check_number, check_date, result, provider_name, next_check_due,
      user_profiles!user_id(first_name, last_name),
      health_surveillance_types!surveillance_type_id(name)
    `)
    .order('check_date', { ascending: false })

  const rows = (records ?? []).map((r) => {
    const profileRaw = r.user_profiles
    const typeRaw = r.health_surveillance_types
    const profile = Array.isArray(profileRaw) ? (profileRaw[0] as { first_name: string; last_name: string } | undefined) ?? null : (profileRaw as { first_name: string; last_name: string } | null)
    const type = Array.isArray(typeRaw) ? (typeRaw[0] as { name: string } | undefined) ?? null : (typeRaw as { name: string } | null)
    return {
      id: r.id,
      check_number: r.check_number ?? '—',
      worker_name: profile ? `${profile.first_name} ${profile.last_name}` : '—',
      surveillance_type: type?.name ?? '—',
      check_date: r.check_date ?? null,
      result: r.result,
      provider_name: r.provider_name ?? '—',
      next_check_due: r.next_check_due ?? null,
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Health Surveillance
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} check{rows.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <Button kind="primary" href="/health/new" style={{ justifyContent: 'center' }}>
          Log Health Check
        </Button>
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No health checks recorded
          </div>
        ) : (
          <DataTableClient
            id="health-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search health checks…"
          />
        )}
      </Tile>
    </div>
  )
}
