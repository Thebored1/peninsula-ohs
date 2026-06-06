import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

const WARDEN_LABELS: Record<string, string> = {
  chief_warden: 'Chief Warden',
  area_warden: 'Area Warden',
  first_aid_officer: 'First Aid Officer',
  deputy_warden: 'Deputy Warden',
}

export default async function WardenPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('emergency_wardens')
    .select('id, warden_type, area, is_active, sites(name), user_profiles!worker_id(first_name, last_name, email)')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  const rows = (data ?? []).map((r) => {
    const siteRaw = r.sites
    const profileRaw = r.user_profiles
    const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)
    const profile = Array.isArray(profileRaw) ? (profileRaw[0] as { first_name: string; last_name: string; email: string } | undefined) ?? null : (profileRaw as { first_name: string; last_name: string; email: string } | null)
    return {
      id: r.id,
      worker_name: profile ? `${profile.first_name} ${profile.last_name}` : '—',
      worker_email: profile?.email ?? '—',
      warden_type: WARDEN_LABELS[r.warden_type] ?? r.warden_type,
      area: r.area ?? '—',
      site_name: site?.name ?? '—',
      is_active: r.is_active ? 'Active' : 'Inactive',
    }
  })

  const columns: ColDef[] = [
    { key: 'worker_name', header: 'Warden' },
    { key: 'worker_email', header: 'Email' },
    { key: 'warden_type', header: 'Role' },
    { key: 'area', header: 'Area' },
    { key: 'site_name', header: 'Site' },
    { key: 'is_active', header: 'Status', cellConfig: { as: 'tag', map: { Active: 'green', Inactive: 'gray' } } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Emergency Wardens
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} warden{rows.length !== 1 ? 's' : ''} assigned
          </p>
        </div>
        <NewButton href="/emergency/wardens/new" label="Add Warden" />
      </div>
      <DataTableClient id="wardens-table" rows={rows} columns={columns} searchPlaceholder="Search wardens…" />
    </div>
  )
}
