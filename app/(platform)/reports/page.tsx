import { createClient } from '@/lib/supabase/server'
import { Grid, Column, Tile, Tag } from '@carbon/react'
import Link from 'next/link'
import ExportCSVButton from './ExportCSVButton'
import { NewButton } from '@/components/ui/NewButton'
import TrendChart from '@/components/charts/TrendChart'

type TagType = 'blue' | 'teal'

function indicatorTag(type: string): TagType {
  return type === 'leading' ? 'teal' : 'blue'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Return the last N calendar months as { label, start, end } objects */
function lastNMonths(n: number) {
  const months: { label: string; start: Date; end: Date }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    const label = start.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
    months.push({ label, start, end })
  }
  return months
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let orgId: string
  if (user) {
    const { data: profile } = await supabase.from('user_profiles').select('organisation_id').eq('id', user.id).single()
    orgId = profile?.organisation_id ?? null
    if (!orgId) return <div style={{ padding: '2rem' }}><p style={{ color: '#6f6f6f' }}>Profile not found.</p></div>
  } else {
    const { data: firstOrg } = await supabase.from('organisations').select('id').limit(1).single()
    if (!firstOrg) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>
    orgId = firstOrg.id
  }

  const months = lastNMonths(6)
  const sixMonthsAgo = months[0].start.toISOString()

  const [
    { data: kpis },
    { data: snapshots },
    { data: reportDefs },
    { data: incidents },
    { data: actionItems },
  ] = await Promise.all([
    supabase
      .from('kpi_definitions')
      .select('id, name, short_name, description, formula_description, unit, indicator_type, benchmark_direction, is_active')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('kpi_snapshots')
      .select('kpi_definition_id, value, period_type, period_start, period_end')
      .eq('organisation_id', orgId)
      .eq('is_current', true),
    supabase
      .from('report_definitions')
      .select('id, name, description')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('incidents')
      .select('id, incident_date')
      .eq('organisation_id', orgId)
      .gte('incident_date', sixMonthsAgo),
    supabase
      .from('action_items')
      .select('id, due_date, status, closed_at')
      .eq('organisation_id', orgId)
      .gte('due_date', sixMonthsAgo),
  ])

  const snapshotMap = new Map<string, { value: number | null; period_type: string; period_start: string; period_end: string }>()
  for (const s of (snapshots ?? [])) {
    if (!snapshotMap.has(s.kpi_definition_id)) {
      snapshotMap.set(s.kpi_definition_id, {
        value: s.value,
        period_type: s.period_type,
        period_start: s.period_start,
        period_end: s.period_end,
      })
    }
  }

  // Build incident trend: count per month
  const incidentTrend = months.map(({ label, start, end }) => {
    const count = (incidents ?? []).filter((inc) => {
      const d = new Date(inc.incident_date)
      return d >= start && d <= end
    }).length
    return { label, value: count }
  })

  // Build CAPA completion rate per month: (closed in month / due in month) * 100
  const capaTrend = months.map(({ label, start, end }) => {
    const dueInMonth = (actionItems ?? []).filter((a) => {
      const d = new Date(a.due_date)
      return d >= start && d <= end
    })
    if (dueInMonth.length === 0) return { label, value: 0 }
    const closed = dueInMonth.filter(
      (a) => a.status === 'closed' || a.status === 'completed'
    ).length
    return { label, value: Math.round((closed / dueInMonth.length) * 100) }
  })

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Reports &amp; KPIs
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            Key performance indicators and scheduled reports
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ExportCSVButton orgId={orgId} />
          <NewButton href="/reports/builder" label="Report Builder" kind="ghost" />
        </div>
      </div>

      {/* Trend Charts */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
        Trends (Last 6 Months)
      </h2>
      <Grid condensed style={{ marginBottom: '2rem' }}>
        <Column sm={4} md={4} lg={8}>
          <Tile style={{ padding: '1.5rem' }}>
            <TrendChart
              data={incidentTrend}
              title="Incidents by Month"
              color="#da1e28"
            />
          </Tile>
        </Column>
        <Column sm={4} md={4} lg={8}>
          <Tile style={{ padding: '1.5rem' }}>
            <TrendChart
              data={capaTrend}
              title="CAPA Completion Rate (%) by Month"
              color="#0f62fe"
            />
          </Tile>
        </Column>
      </Grid>

      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
        Key Performance Indicators
      </h2>
      <Grid condensed style={{ marginBottom: '2rem' }}>
        {(kpis ?? []).map((kpi) => {
          const snap = snapshotMap.get(kpi.id)
          const hasValue = snap?.value != null
          return (
            <Column key={kpi.id} sm={4} md={4} lg={4}>
              <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <Tag type={indicatorTag(kpi.indicator_type)} size="sm">{kpi.indicator_type}</Tag>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                  {kpi.short_name}
                </p>
                <p style={{ fontSize: '2rem', fontWeight: 300, color: '#161616', marginBottom: '0.25rem', lineHeight: 1.2 }}>
                  {hasValue
                    ? Number(snap!.value).toFixed(2)
                    : <span style={{ fontSize: '1.25rem', color: '#6f6f6f' }}>No data yet</span>}
                </p>
                {hasValue && (
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.5rem' }}>
                    {snap!.period_type} · {formatDate(snap!.period_start)} – {formatDate(snap!.period_end)}
                  </p>
                )}
                <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '0.25rem' }}>{kpi.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                  {kpi.benchmark_direction === 'lower_is_better' ? `↓ lower is better (${kpi.unit})` : `↑ higher is better (${kpi.unit})`}
                </p>
                {kpi.formula_description && (
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.5rem', fontStyle: 'italic' }}>
                    {kpi.formula_description}
                  </p>
                )}
              </Tile>
            </Column>
          )
        })}
      </Grid>

      {(reportDefs ?? []).length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>Saved Reports</h2>
          <Grid condensed>
            {reportDefs!.map((rd) => (
              <Column key={rd.id} sm={4} md={4} lg={4}>
                <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>{rd.name}</p>
                  {rd.description && <p style={{ fontSize: '0.75rem', color: '#525252' }}>{rd.description}</p>}
                </Tile>
              </Column>
            ))}
          </Grid>
        </>
      )}

      {(kpis ?? []).length === 0 && (
        <Tile>
          <p style={{ fontSize: '0.875rem', color: '#6f6f6f', textAlign: 'center', padding: '2rem' }}>
            No KPI definitions found.
          </p>
        </Tile>
      )}
    </div>
  )
}
