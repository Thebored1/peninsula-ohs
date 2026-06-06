import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ActivationsPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('emergency_activations')
    .select('id, activation_number, emergency_type, status, activated_at, all_clear_at, sites(name)')
    .eq('organisation_id', orgId)
    .order('activated_at', { ascending: false })

  const rows = (data ?? []).map((r) => {
    const siteRaw = r.sites
    const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)
    return {
      id: r.id,
      activation_number: r.activation_number ?? '—',
      emergency_type: r.emergency_type,
      site_name: site?.name ?? '—',
      activated_at: r.activated_at ? formatDate(r.activated_at) : '—',
      all_clear_at: r.all_clear_at ? formatDate(r.all_clear_at) : '—',
      status: r.status,
    }
  })

  const columns: ColDef[] = [
    { key: 'activation_number', header: 'Activation #' },
    { key: 'emergency_type', header: 'Emergency Type' },
    { key: 'site_name', header: 'Site' },
    { key: 'activated_at', header: 'Activated' },
    { key: 'all_clear_at', header: 'All Clear' },
    { key: 'status', header: 'Status', cellConfig: { as: 'tag', map: { active: 'red', all_clear: 'cyan', closed: 'green' }, transform: true } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/emergency/activations/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Emergency Activations
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} activation{rows.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <NewButton href="/emergency/activations/new" label="Activate Emergency" kind="secondary" />
      </div>
      <DataTableClient id="activations-table" rows={rows} columns={columns} searchPlaceholder="Search activations…" />
    </div>
  )
}
