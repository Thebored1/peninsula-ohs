import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

export default async function ToolboxHistoryPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  // Fetch all deliveries with joins
  const { data: deliveries } = await supabase
    .from('toolbox_talk_deliveries')
    .select(`
      id, delivery_number, title, delivered_at, created_at,
      sites(name),
      user_profiles!toolbox_talk_deliveries_delivered_by_fkey(first_name, last_name),
      toolbox_talk_templates(title, toolbox_talk_categories(name, colour_code))
    `)
    .eq('organisation_id', orgId)
    .order('delivered_at', { ascending: false })

  // Fetch attendee counts per delivery
  const deliveryIds = (deliveries ?? []).map(d => d.id)
  let attendeeCounts: Record<string, number> = {}

  if (deliveryIds.length > 0) {
    const { data: attendeeRows } = await supabase
      .from('toolbox_talk_attendees')
      .select('delivery_id')
      .in('delivery_id', deliveryIds)

    for (const row of attendeeRows ?? []) {
      attendeeCounts[row.delivery_id] = (attendeeCounts[row.delivery_id] ?? 0) + 1
    }
  }

  const rows = (deliveries ?? []).map(d => {
    const siteRaw = d.sites
    const site = Array.isArray(siteRaw)
      ? (siteRaw[0] as { name: string } | undefined)
      : (siteRaw as { name: string } | null)

    const delivererRaw = d.user_profiles
    const deliverer = Array.isArray(delivererRaw)
      ? (delivererRaw[0] as { first_name: string; last_name: string } | undefined)
      : (delivererRaw as { first_name: string; last_name: string } | null)

    const templateRaw = d.toolbox_talk_templates as unknown as {
      title: string
      toolbox_talk_categories: { name: string; colour_code: string } | null
    } | null

    return {
      id: d.id,
      delivery_number: d.delivery_number ?? '—',
      title: d.title,
      site: site?.name ?? '—',
      delivered_by: deliverer ? `${deliverer.first_name} ${deliverer.last_name}` : '—',
      delivered_at: d.delivered_at,
      attendees_count: attendeeCounts[d.id] ?? 0,
      category_colour: templateRaw?.toolbox_talk_categories?.colour_code ?? '#525252',
      category: templateRaw?.toolbox_talk_categories?.name ?? '',
    }
  })

  const columns: ColDef[] = [
    { key: 'delivery_number', header: 'TBX #', cellConfig: { as: 'monospace' } },
    { key: 'title', header: 'Title', cellConfig: { as: 'text_link', prefix: '/toolbox/' } },
    {
      key: 'category',
      header: 'Category',
      cellConfig: { as: 'dot_text', colourField: 'category_colour' },
    },
    { key: 'site', header: 'Site' },
    { key: 'delivered_by', header: 'Delivered By' },
    { key: 'delivered_at', header: 'Delivered', cellConfig: { as: 'date' } },
    { key: 'attendees_count', header: 'Attendees' },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/toolbox/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.25rem' }}>
        <BreadcrumbItem href="/toolbox">Toolbox Talks</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Talk History</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Talk History
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} talk{rows.length !== 1 ? 's' : ''} delivered
          </p>
        </div>
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No toolbox talks delivered yet.{' '}
            <a href="/toolbox/deliver" style={{ color: '#0f62fe', textDecoration: 'none' }}>
              Deliver the first talk
            </a>.
          </div>
        ) : (
          <DataTableClient
            id="toolbox-history"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search talk history…"
          />
        )}
      </Tile>
    </div>
  )
}
