import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

const columns: ColDef[] = [
  { key: 'standard_code', header: 'Standard Code' },
  { key: 'title', header: 'Title' },
  { key: 'jurisdiction', header: 'Jurisdiction' },
  {
    key: 'status',
    header: 'Status',
    cellConfig: {
      as: 'tag',
      map: { current: 'green', superseded: 'gray', withdrawn: 'red' },
      default: 'gray',
      transform: true,
    },
  },
  {
    key: 'effective_date',
    header: 'Effective Date',
    cellConfig: { as: 'date' },
  },
  {
    key: 'view',
    header: '',
    cellConfig: { as: 'view_link', prefix: '/regulatory/' },
  },
]

export default async function RegulatoryPage() {
  const supabase = await createClient()

  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p style={{ color: '#6f6f6f' }}>No organisation found.</p></div>

  const { data: standards } = await supabase
    .from('regulatory_standards')
    .select('id, standard_code, title, jurisdiction, status, effective_date')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  const rows = (standards ?? []).map((s) => ({
    id: s.id,
    standard_code: s.standard_code ?? '—',
    title: s.title,
    jurisdiction: s.jurisdiction ?? '—',
    status: s.status ?? 'current',
    effective_date: s.effective_date ?? null,
  }))

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Regulatory Library
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} standard{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button kind="primary" href="/regulatory/new" style={{ justifyContent: 'center' }}>
          Add Standard
        </Button>
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No regulatory standards found
          </div>
        ) : (
          <DataTableClient
            id="regulatory-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search standards…"
          />
        )}
      </Tile>
    </div>
  )
}
