import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function InductionsPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('induction_programs')
    .select('id, name, description, applies_to, is_active, created_at, sites!site_id(name)')
    .eq('organisation_id', orgId)
    .order('name', { ascending: true })

  const rows = (data ?? []).map((p) => {
    const siteRaw = p.sites
    const site = Array.isArray(siteRaw)
      ? (siteRaw[0] as { name: string } | undefined) ?? null
      : (siteRaw as { name: string } | null)
    return {
      id: p.id,
      name: p.name,
      applies_to: p.applies_to ?? 'all',
      site_name: site?.name ?? 'All sites',
      is_active: p.is_active,
      created_at: formatDate(p.created_at),
    }
  })

  const columns: ColDef[] = [
    { key: 'name', header: 'Program Name' },
    {
      key: 'applies_to',
      header: 'Applies To',
      cellConfig: {
        as: 'tag',
        map: { all: 'blue', employees: 'teal', contractors: 'cyan', visitors: 'gray' },
        transform: true,
      },
    },
    { key: 'site_name', header: 'Site' },
    { key: 'is_active', header: 'Active', cellConfig: { as: 'bool_tag', trueType: 'green', trueLabel: 'Active', falseType: 'gray', falseLabel: 'Inactive' } },
    { key: 'created_at', header: 'Created' },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/training/inductions/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Induction Programs</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} program{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NewButton href="/training/inductions/new" label="New Program" />
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No induction programs defined yet
          </div>
        ) : (
          <DataTableClient
            id="inductions-table"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search induction programs…"
          />
        )}
      </Tile>
    </div>
  )
}
