import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Grid, Column } from '@carbon/react'
import Link from 'next/link'

function StatCard({ label, value, href, colour }: { label: string; value: number; href: string; colour: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Tile style={{ padding: '1.5rem', borderTop: `4px solid ${colour}`, cursor: 'pointer' }}>
        <p style={{ fontSize: '2rem', fontWeight: 300, color: '#161616', marginBottom: '0.25rem' }}>{value}</p>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>{label}</p>
      </Tile>
    </Link>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function EmergencyPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const now = new Date()
  const yearStart = `${now.getFullYear()}-01-01`
  const yearEnd = `${now.getFullYear()}-12-31`
  const todayIso = now.toISOString()

  const [
    { count: plansCount },
    { count: wardensCount },
    { count: drillsThisYear },
    { count: activeCount },
    { data: upcomingDrills },
    { data: activeActivations },
  ] = await Promise.all([
    supabase.from('emergency_response_plans').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'active'),
    supabase.from('emergency_wardens').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('is_active', true),
    supabase.from('emergency_drills').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId).gte('scheduled_date', yearStart).lte('scheduled_date', yearEnd),
    supabase.from('emergency_activations').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'active'),
    supabase.from('emergency_drills').select('id, drill_number, title, scheduled_date, drill_type, sites(name)').eq('organisation_id', orgId).eq('status', 'scheduled').gte('scheduled_date', todayIso.slice(0, 10)).order('scheduled_date', { ascending: true }).limit(5),
    supabase.from('emergency_activations').select('id, activation_number, emergency_type, activated_at, sites(name)').eq('organisation_id', orgId).eq('status', 'active').order('activated_at', { ascending: false }),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
          Emergency Management
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>
          Response plans, drills, wardens and activations
        </p>
      </div>

      {(activeCount ?? 0) > 0 && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.5rem',
          backgroundColor: '#fff1f1',
          border: '1px solid #da1e28',
          borderLeft: '4px solid #da1e28',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#da1e28' }}>
              ACTIVE EMERGENCY — {activeCount} activation{(activeCount ?? 0) > 1 ? 's' : ''} in progress
            </p>
            <p style={{ fontSize: '0.75rem', color: '#750e13' }}>Immediate action required</p>
          </div>
          <Link href="/emergency/activations" style={{
            fontSize: '0.875rem',
            color: '#da1e28',
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            View Activations
          </Link>
        </div>
      )}

      <Grid condensed style={{ marginBottom: '2rem' }}>
        <Column sm={4} md={2} lg={4}>
          <StatCard label="Active Plans" value={plansCount ?? 0} href="/emergency/plans" colour="#0f62fe" />
        </Column>
        <Column sm={4} md={2} lg={4}>
          <StatCard label="Wardens" value={wardensCount ?? 0} href="/emergency/wardens" colour="#ff832b" />
        </Column>
        <Column sm={4} md={2} lg={4}>
          <StatCard label="Drills This Year" value={drillsThisYear ?? 0} href="/emergency/drills" colour="#24a148" />
        </Column>
        <Column sm={4} md={2} lg={4}>
          <StatCard label="Active Emergencies" value={activeCount ?? 0} href="/emergency/activations" colour="#da1e28" />
        </Column>
      </Grid>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Upcoming Drills</h2>
              <Link href="/emergency/drills/new" style={{ fontSize: '0.75rem', color: '#0f62fe', textDecoration: 'none' }}>
                Schedule Drill
              </Link>
            </div>
            {!upcomingDrills || upcomingDrills.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No upcoming drills scheduled
              </div>
            ) : (
              <div>
                {upcomingDrills.map((drill) => {
                  const siteRaw = drill.sites
                  const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)
                  return (
                    <Link key={drill.id} href={`/emergency/drills/${drill.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid #f4f4f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.25rem' }}>{drill.title}</p>
                          <p style={{ fontSize: '0.75rem', color: '#525252' }}>
                            {drill.drill_type?.replace(/_/g, ' ')} {site ? `· ${site.name}` : ''}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                          <p style={{ fontSize: '0.75rem', color: '#525252' }}>
                            {drill.scheduled_date ? formatDate(drill.scheduled_date) : '—'}
                          </p>
                          {drill.drill_number && (
                            <p style={{ fontSize: '0.75rem', color: '#8d8d8d', fontFamily: 'monospace' }}>{drill.drill_number}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
            <div style={{ padding: '0.75rem 1.5rem' }}>
              <Link href="/emergency/drills" style={{ fontSize: '0.75rem', color: '#0f62fe', textDecoration: 'none' }}>
                View all drills →
              </Link>
            </div>
          </Tile>
        </Column>

        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Navigation</h2>
            </div>
            <div style={{ padding: '1rem 1.5rem' }}>
              <Grid condensed>
                {[
                  { href: '/emergency/plans', label: 'Response Plans', desc: 'Emergency response procedures' },
                  { href: '/emergency/wardens', label: 'Wardens Register', desc: 'Assigned emergency wardens' },
                  { href: '/emergency/drills', label: 'Drills', desc: 'Scheduled and completed drills' },
                  { href: '/emergency/muster-points', label: 'Muster Points', desc: 'Assembly points and capacity' },
                ].map(({ href, label, desc }) => (
                  <Column sm={4} md={4} lg={8} key={href}>
                    <Link href={href} style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '1rem',
                        border: '1px solid #e0e0e0',
                        marginBottom: '0.75rem',
                        cursor: 'pointer',
                      }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f62fe', marginBottom: '0.25rem' }}>{label}</p>
                        <p style={{ fontSize: '0.75rem', color: '#525252' }}>{desc}</p>
                      </div>
                    </Link>
                  </Column>
                ))}
              </Grid>
            </div>
          </Tile>

          {(activeCount ?? 0) > 0 && activeActivations && activeActivations.length > 0 && (
            <Tile style={{ padding: 0 }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#da1e28' }}>Active Emergencies</h2>
              </div>
              <div>
                {activeActivations.map((act) => {
                  const siteRaw = act.sites
                  const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)
                  return (
                    <Link key={act.id} href={`/emergency/activations/${act.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid #f4f4f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.25rem' }}>{act.emergency_type}</p>
                          <p style={{ fontSize: '0.75rem', color: '#525252' }}>{site?.name ?? 'All sites'}</p>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#da1e28' }}>
                          {act.activated_at ? formatDate(act.activated_at) : '—'}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </Tile>
          )}
        </Column>
      </Grid>
    </div>
  )
}
