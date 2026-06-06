import { createClient } from '@/lib/supabase/server'
import { Grid, Column, Tile, Tag } from '@carbon/react'
import {
  Warning,
  TaskComplete,
  DataError,
  Certificate,
  ArrowUp,
  ArrowDown,
  Subtract,
} from '@carbon/icons-react'

async function getDashboardStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [incidents, actions, risks, permits] = await Promise.all([
    supabase
      .from('incidents')
      .select('id, status, created_at', { count: 'exact' })
      .in('status', ['open', 'under_investigation']),
    supabase
      .from('actions')
      .select('id, status, due_date', { count: 'exact' })
      .eq('status', 'overdue'),
    supabase
      .from('risks')
      .select('id, risk_level', { count: 'exact' })
      .in('risk_level', ['high', 'critical'])
      .eq('status', 'open'),
    supabase
      .from('permits')
      .select('id, status', { count: 'exact' })
      .in('status', ['pending_approval', 'active']),
  ])

  return {
    openIncidents: incidents.count ?? 0,
    overdueActions: actions.count ?? 0,
    highRisks: risks.count ?? 0,
    activePermits: permits.count ?? 0,
  }
}

async function getRecentIncidents(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('incidents')
    .select('id, incident_number, title, status, severity_level_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

async function getOverdueActions(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('actions')
    .select('id, action_number, title, due_date, status')
    .eq('status', 'overdue')
    .order('due_date', { ascending: true })
    .limit(5)
  return data ?? []
}

const statusColors: Record<string, 'red' | 'green' | 'blue' | 'gray' | 'teal' | 'cyan' | 'purple' | 'warm-gray' | 'cool-gray' | 'magenta' | 'high-contrast'> = {
  open: 'red',
  under_investigation: 'purple',
  closed: 'green',
  overdue: 'red',
  in_progress: 'blue',
  pending_approval: 'cyan',
  active: 'teal',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface StatTileProps {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number }>
  accentColor: string
  trend?: 'up' | 'down' | 'flat'
  trendLabel?: string
  href: string
}

function StatTile({ label, value, icon: Icon, accentColor, trend, trendLabel, href }: StatTileProps) {
  return (
    <a href={href} style={{ textDecoration: 'none' }}>
      <Tile
        style={{
          minHeight: '7rem',
          borderTop: `3px solid ${accentColor}`,
          cursor: 'pointer',
          transition: 'background-color 150ms',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem', letterSpacing: '0.32px' }}>
              {label}
            </p>
            <p style={{ fontSize: '2.625rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>
              {value}
            </p>
            {trendLabel && (
              <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {trend === 'up' && <ArrowUp size={12} />}
                {trend === 'down' && <ArrowDown size={12} />}
                {trend === 'flat' && <Subtract size={12} />}
                {trendLabel}
              </p>
            )}
          </div>
          <Icon size={20} />
        </div>
      </Tile>
    </a>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const [stats, recentIncidents, overdueActions] = await Promise.all([
    getDashboardStats(supabase),
    getRecentIncidents(supabase),
    getOverdueActions(supabase),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.25rem', letterSpacing: '0.32px' }}>
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Dashboard</h1>
      </div>

      {/* Stat tiles */}
      <Grid condensed style={{ marginBottom: '2rem' }}>
        <Column sm={4} md={4} lg={4}>
          <StatTile
            label="OPEN INCIDENTS"
            value={stats.openIncidents}
            icon={Warning}
            accentColor="#da1e28"
            href="/incidents"
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <StatTile
            label="OVERDUE ACTIONS"
            value={stats.overdueActions}
            icon={TaskComplete}
            accentColor="#f1c21b"
            href="/actions"
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <StatTile
            label="HIGH / CRITICAL RISKS"
            value={stats.highRisks}
            icon={DataError}
            accentColor="#ff832b"
            href="/risks"
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <StatTile
            label="ACTIVE PERMITS"
            value={stats.activePermits}
            icon={Certificate}
            accentColor="#0f62fe"
            href="/permits"
          />
        </Column>
      </Grid>

      {/* Lower panels */}
      <Grid condensed>
        {/* Recent incidents */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0 }}>
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Recent Incidents</h2>
              <a href="/incidents" style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
                View all
              </a>
            </div>
            {recentIncidents.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No incidents recorded
              </div>
            ) : (
              <div>
                {recentIncidents.map((incident, i) => (
                  <a
                    key={incident.id}
                    href={`/incidents/${incident.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.875rem 1.5rem',
                      borderBottom: i < recentIncidents.length - 1 ? '1px solid #e0e0e0' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                        {incident.incident_number}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.125rem' }}>
                        {incident.title ?? '—'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <Tag type={statusColors[incident.status] ?? 'gray'} size="sm">
                        {incident.status?.replace(/_/g, ' ')}
                      </Tag>
                      <span style={{ fontSize: '0.75rem', color: '#6f6f6f', whiteSpace: 'nowrap' }}>
                        {formatDate(incident.created_at)}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Tile>
        </Column>

        {/* Overdue actions */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0 }}>
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Overdue Actions</h2>
              <a href="/actions?filter=overdue" style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
                View all
              </a>
            </div>
            {overdueActions.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No overdue actions
              </div>
            ) : (
              <div>
                {overdueActions.map((action, i) => (
                  <a
                    key={action.id}
                    href={`/actions/${action.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.875rem 1.5rem',
                      borderBottom: i < overdueActions.length - 1 ? '1px solid #e0e0e0' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                        {action.action_number}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.125rem' }}>
                        {action.title}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Tag type="red" size="sm">Overdue</Tag>
                      <p style={{ fontSize: '0.75rem', color: '#da1e28', marginTop: '0.25rem' }}>
                        Due {formatDate(action.due_date)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
