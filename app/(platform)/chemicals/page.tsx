import { createClient } from '@/lib/supabase/server'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

const columns: ColDef[] = [
  { key: 'chemical_number', header: 'Chemical #' },
  { key: 'name', header: 'Name' },
  { key: 'category_name', header: 'Category' },
  { key: 'physical_state', header: 'State' },
  { key: 'cas_number', header: 'CAS Number' },
  {
    key: 'is_hazardous',
    header: 'Hazardous',
    cellConfig: {
      as: 'bool_tag',
      trueType: 'red',
      trueLabel: 'Hazardous',
      falseType: 'green',
      falseLabel: 'Non-hazardous',
    },
  },
  {
    key: 'view',
    header: '',
    cellConfig: { as: 'view_link', prefix: '/chemicals/' },
  },
]

export default async function ChemicalsPage() {
  const supabase = await createClient()

  const { data: chemicals } = await supabase
    .from('chemicals')
    .select('id, chemical_number, name, cas_number, un_number, is_hazardous, chemical_categories(name), chemical_physical_states(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const rows = (chemicals ?? []).map((c) => {
    const catRaw = c.chemical_categories
    const stateRaw = c.chemical_physical_states
    const cat = Array.isArray(catRaw) ? (catRaw[0] as { name: string } | undefined) ?? null : (catRaw as { name: string } | null)
    const state = Array.isArray(stateRaw) ? (stateRaw[0] as { name: string } | undefined) ?? null : (stateRaw as { name: string } | null)
    return {
      id: c.id,
      chemical_number: c.chemical_number ?? '—',
      name: c.name,
      category_name: cat?.name ?? '—',
      physical_state: state?.name ?? '—',
      cas_number: c.cas_number ?? '—',
      is_hazardous: c.is_hazardous,
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Chemicals
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} chemical{rows.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Button kind="primary" href="/chemicals/new" style={{ justifyContent: 'center' }}>
          Add Chemical
        </Button>
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No chemicals registered
          </div>
        ) : (
          <DataTableClient
            id="chemicals-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search chemicals…"
          />
        )}
      </Tile>
    </div>
  )
}
