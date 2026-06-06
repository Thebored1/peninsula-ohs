import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import { NewButton } from '@/components/ui/NewButton'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ToolboxPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString()
  const todayStr = now.toISOString().slice(0, 10)

  // Deliveries this month
  const { data: deliveriesThisMonth } = await supabase
    .from('toolbox_talk_deliveries')
    .select('id')
    .eq('organisation_id', orgId)
    .gte('delivered_at', startOfMonth)

  // Deliveries this week
  const { data: deliveriesThisWeek } = await supabase
    .from('toolbox_talk_deliveries')
    .select('id')
    .eq('organisation_id', orgId)
    .gte('delivered_at', startOfWeek)

  // Attendees this month (count via join)
  const { data: attendeesThisMonth } = await supabase
    .from('toolbox_talk_attendees')
    .select('id, toolbox_talk_deliveries!inner(organisation_id, delivered_at)')
    .eq('toolbox_talk_deliveries.organisation_id', orgId)
    .gte('toolbox_talk_deliveries.delivered_at', startOfMonth)

  // Overdue schedules
  const { data: overdueSchedules } = await supabase
    .from('toolbox_talk_schedules')
    .select(`
      id, title, scheduled_date,
      toolbox_talk_templates(title),
      sites(name),
      user_profiles!toolbox_talk_schedules_assigned_to_fkey(first_name, last_name)
    `)
    .eq('organisation_id', orgId)
    .eq('status', 'pending')
    .lt('scheduled_date', todayStr)
    .order('scheduled_date', { ascending: true })

  // Recent deliveries (last 10)
  const { data: recentDeliveries } = await supabase
    .from('toolbox_talk_deliveries')
    .select(`
      id, delivery_number, title, delivered_at,
      sites(name),
      user_profiles!toolbox_talk_deliveries_delivered_by_fkey(first_name, last_name),
      toolbox_talk_templates(title, toolbox_talk_categories(name, colour_code))
    `)
    .eq('organisation_id', orgId)
    .order('delivered_at', { ascending: false })
    .limit(10)

  const weekCount = deliveriesThisWeek?.length ?? 0
  const monthCount = deliveriesThisMonth?.length ?? 0
  const attendeeCount = attendeesThisMonth?.length ?? 0
  const overdueCount = overdueSchedules?.length ?? 0

  const stats = [
    { label: 'This Week', value: weekCount, sub: 'talks delivered' },
    { label: 'This Month', value: monthCount, sub: 'talks delivered' },
    { label: 'Attendees This Month', value: attendeeCount, sub: 'total attendance' },
    { label: 'Overdue Scheduled', value: overdueCount, sub: 'require attention', alert: overdueCount > 0 },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Toolbox Talks
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            Safety briefings, hazard talks and worker engagement
          </p>
        </div>
        <NewButton href="/toolbox/deliver" label="Deliver a Talk" />
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <Tile key={s.label} style={{ padding: '1.25rem' }}>
            <p style={{
              fontSize: '2rem',
              fontWeight: 300,
              color: s.alert ? '#da1e28' : '#161616',
              lineHeight: 1,
              marginBottom: '0.375rem',
            }}>
              {s.value}
            </p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.125rem' }}>
              {s.label}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{s.sub}</p>
          </Tile>
        ))}
      </div>

      {/* Quick navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { href: '/toolbox/templates', label: 'Templates Library' },
          { href: '/toolbox/history', label: 'Talk History' },
          { href: '/toolbox/schedule', label: 'Schedules' },
        ].map(link => (
          <a
            key={link.href}
            href={link.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              border: '1px solid #e0e0e0',
              backgroundColor: '#ffffff',
              color: '#0f62fe',
              fontSize: '0.875rem',
              textDecoration: 'none',
              fontWeight: 400,
            }}
          >
            {link.label}
          </a>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Recent deliveries */}
        <Tile style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Recent Deliveries</h2>
            <a href="/toolbox/history" style={{ fontSize: '0.75rem', color: '#0f62fe', textDecoration: 'none' }}>
              View all
            </a>
          </div>
          {(recentDeliveries ?? []).length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
              No talks delivered yet.{' '}
              <a href="/toolbox/deliver" style={{ color: '#0f62fe', textDecoration: 'none' }}>
                Deliver the first talk
              </a>.
            </div>
          ) : (
            <div>
              {(recentDeliveries ?? []).map((d, idx) => {
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
                const catColour = templateRaw?.toolbox_talk_categories?.colour_code ?? '#525252'

                return (
                  <div
                    key={d.id}
                    style={{
                      padding: '0.875rem 1.5rem',
                      borderBottom: idx < (recentDeliveries ?? []).length - 1 ? '1px solid #e0e0e0' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                        {templateRaw?.toolbox_talk_categories && (
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            backgroundColor: catColour, flexShrink: 0, display: 'inline-block',
                          }} />
                        )}
                        <a
                          href={`/toolbox/${d.id}`}
                          style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none', fontWeight: 400 }}
                        >
                          {d.title}
                        </a>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                        {deliverer ? `${deliverer.first_name} ${deliverer.last_name}` : '—'}
                        {site ? ` · ${site.name}` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#6f6f6f', flexShrink: 0 }}>
                      {formatDate(d.delivered_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Tile>

        {/* Overdue scheduled talks */}
        <Tile style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Overdue Scheduled Talks</h2>
            <a href="/toolbox/schedule" style={{ fontSize: '0.75rem', color: '#0f62fe', textDecoration: 'none' }}>
              View schedule
            </a>
          </div>
          {overdueCount === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
              No overdue talks. You&apos;re all up to date.
            </div>
          ) : (
            <div>
              {(overdueSchedules ?? []).map((s, idx) => {
                const siteRaw = s.sites
                const site = Array.isArray(siteRaw)
                  ? (siteRaw[0] as { name: string } | undefined)
                  : (siteRaw as { name: string } | null)
                const assigneeRaw = s.user_profiles
                const assignee = Array.isArray(assigneeRaw)
                  ? (assigneeRaw[0] as { first_name: string; last_name: string } | undefined)
                  : (assigneeRaw as { first_name: string; last_name: string } | null)
                const daysOverdue = Math.floor((now.getTime() - new Date(s.scheduled_date).getTime()) / 86400000)

                return (
                  <div
                    key={s.id}
                    style={{
                      padding: '0.875rem 1.5rem',
                      borderBottom: idx < (overdueSchedules ?? []).length - 1 ? '1px solid #e0e0e0' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      borderLeft: '3px solid #da1e28',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', color: '#161616', fontWeight: 400, marginBottom: '0.125rem' }}>
                        {s.title}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                        {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unassigned'}
                        {site ? ` · ${site.name}` : ''}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '0.75rem', color: '#da1e28', fontWeight: 600 }}>
                        {daysOverdue}d overdue
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                        {formatDate(s.scheduled_date)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Tile>
      </div>
    </div>
  )
}
