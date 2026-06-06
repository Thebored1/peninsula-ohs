import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function EmergencyPlansPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('emergency_response_plans')
    .select('id, plan_number, title, status, version_number, next_review_date, emergency_types(name, colour_code), sites(name)')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  const rows = (data ?? []).map((r) => {
    const typeRaw = r.emergency_types
    const siteRaw = r.sites
    const etype = Array.isArray(typeRaw) ? (typeRaw[0] as { name: string; colour_code: string } | undefined) ?? null : (typeRaw as { name: string; colour_code: string } | null)
    const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)
    return {
      id: r.id,
      plan_number: r.plan_number ?? '—',
      title: r.title,
      emergency_type: etype?.name ?? '—',
      type_colour: etype?.colour_code ?? '#c6c6c6',
      site_name: site?.name ?? '—',
      version_number: r.version_number ?? '—',
      next_review_date: r.next_review_date ?? null,
      status: r.status,
    }
  })

  const columns: ColDef[] = [
    { key: 'plan_number', header: 'Plan #', cellConfig: { as: 'monospace' } },
    { key: 'title', header: 'Title' },
    { key: 'emergency_type', header: 'Type', cellConfig: { as: 'dot_text', colourField: 'type_colour' } },
    { key: 'site_name', header: 'Site' },
    { key: 'version_number', header: 'Version' },
    { key: 'next_review_date', header: 'Next Review', cellConfig: { as: 'due_date' } },
    { key: 'status', header: 'Status', cellConfig: { as: 'tag', map: { draft: 'gray', active: 'green', under_review: 'cyan', archived: 'gray' }, transform: true } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/emergency/plans/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Emergency Response Plans
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} plan{rows.length !== 1 ? 's' : ''} on file
          </p>
        </div>
        <NewButton href="/emergency/plans/new" label="New Plan" />
      </div>
      <DataTableClient id="erp-table" rows={rows} columns={columns} searchPlaceholder="Search plans…" />
    </div>
  )
}
