import { createClient } from '@/lib/supabase/server'
import {
  Grid,
  Column,
  Tile,
  Tag,
  Button,
} from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function HazardsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('hazard_reports')
    .select('id, report_number, title, severity_perception, status, reported_at, user_profiles!reported_by(first_name, last_name)')
    .order('reported_at', { ascending: false })

  const rows = (data ?? []).map((r) => {
    const profile = Array.isArray(r.user_profiles)
      ? r.user_profiles[0]
      : r.user_profiles
    const first = (profile as { first_name?: string } | null)?.first_name ?? ''
    const last = (profile as { last_name?: string } | null)?.last_name ?? ''
    return {
      id: r.id,
      report_number: r.report_number ?? '—',
      title: r.title,
      severity_perception: r.severity_perception,
      status: r.status,
      reported_by_name: [first, last].filter(Boolean).join(' ') || '—',
      reported_at: r.reported_at ? formatDate(r.reported_at) : '—',
    }
  })

  const columns: ColDef[] = [
    { key: 'report_number', header: 'Report #', cellConfig: { as: 'text_link', prefix: '/hazards/' } },
    { key: 'title', header: 'Title' },
    { key: 'severity_perception', header: 'Severity', cellConfig: { as: 'tag', map: { low: 'teal', medium: 'blue', high: 'red', critical: 'red' }, transform: true } },
    { key: 'status', header: 'Status', cellConfig: { as: 'tag', map: { submitted: 'blue', under_review: 'purple', promoted_to_risk: 'cyan', actioned: 'teal', closed: 'gray', rejected: 'red' }, transform: true } },
    { key: 'reported_by_name', header: 'Reported By' },
    { key: 'reported_at', header: 'Date' },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Hazard Reports
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} {rows.length === 1 ? 'report' : 'reports'}
          </p>
        </div>
        <Button kind="primary" href="/hazards/new" style={{ justifyContent: 'center' }}>Report Hazard</Button>
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              color: '#6f6f6f',
              fontSize: '0.875rem',
            }}
          >
            No hazard reports
          </div>
        ) : (
          <DataTableClient id="hazards-search" rows={rows} columns={columns} searchPlaceholder="Search hazard reports…" />
        )}
      </Tile>
    </div>
  )
}
