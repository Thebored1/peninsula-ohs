import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function DrillsPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('emergency_drills')
    .select('id, drill_number, title, status, drill_type, scheduled_date, actual_date, participants_count, sites(name)')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  const rows = (data ?? []).map((r) => {
    const siteRaw = r.sites
    const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)
    return {
      id: r.id,
      drill_number: r.drill_number ?? '—',
      title: r.title,
      drill_type: r.drill_type ?? '—',
      site_name: site?.name ?? '—',
      scheduled_date: r.scheduled_date ? formatDate(r.scheduled_date) : '—',
      actual_date: r.actual_date ? formatDate(r.actual_date) : '—',
      participants_count: r.participants_count ?? '—',
      status: r.status,
    }
  })

  const columns: ColDef[] = [
    { key: 'drill_number', header: 'Drill #', cellConfig: { as: 'monospace' } },
    { key: 'title', header: 'Title' },
    { key: 'drill_type', header: 'Type' },
    { key: 'site_name', header: 'Site' },
    { key: 'scheduled_date', header: 'Scheduled' },
    { key: 'actual_date', header: 'Actual Date' },
    { key: 'participants_count', header: 'Participants' },
    { key: 'status', header: 'Status', cellConfig: { as: 'tag', map: { scheduled: 'blue', completed: 'green', cancelled: 'gray' }, transform: true } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/emergency/drills/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Emergency Drills
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} drill{rows.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <NewButton href="/emergency/drills/new" label="Schedule Drill" />
      </div>
      <DataTableClient id="drills-table" rows={rows} columns={columns} searchPlaceholder="Search drills…" />
    </div>
  )
}
