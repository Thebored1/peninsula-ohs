import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

export default async function MusterPointsPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('muster_points')
    .select('id, name, location_description, capacity, is_primary, sites(name)')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  const rows = (data ?? []).map((r) => {
    const siteRaw = r.sites
    const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)
    return {
      id: r.id,
      name: r.name,
      site_name: site?.name ?? '—',
      location_description: r.location_description ?? '—',
      capacity: r.capacity ?? '—',
      is_primary: r.is_primary ? 'Primary' : 'Secondary',
    }
  })

  const columns: ColDef[] = [
    { key: 'name', header: 'Name' },
    { key: 'site_name', header: 'Site' },
    { key: 'location_description', header: 'Location' },
    { key: 'capacity', header: 'Capacity' },
    { key: 'is_primary', header: 'Type', cellConfig: { as: 'tag', map: { Primary: 'green', Secondary: 'gray' } } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Muster Points
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} muster point{rows.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <NewButton href="/emergency/muster-points/new" label="Add Muster Point" />
      </div>
      <DataTableClient id="muster-table" rows={rows} columns={columns} searchPlaceholder="Search muster points…" />
    </div>
  )
}
