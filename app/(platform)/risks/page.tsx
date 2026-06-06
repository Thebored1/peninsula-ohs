import { createClient } from '@/lib/supabase/server'
import { Tile, Tag, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

export default async function RisksPage() {
  const supabase = await createClient()

  const { data: risks } = await supabase
    .from('risks')
    .select('id, risk_number, title, inherent_risk_score, inherent_risk_level, residual_risk_score, residual_risk_level, status, next_review_date, risk_categories(name)')
    .order('inherent_risk_score', { ascending: false })

  const allRisks = risks ?? []

  // Summary counts
  const counts = {
    critical: allRisks.filter((r) => (r.inherent_risk_level ?? '').toLowerCase() === 'critical').length,
    high: allRisks.filter((r) => (r.inherent_risk_level ?? '').toLowerCase() === 'high').length,
    medium: allRisks.filter((r) => (r.inherent_risk_level ?? '').toLowerCase() === 'medium').length,
    low: allRisks.filter((r) => (r.inherent_risk_level ?? '').toLowerCase() === 'low').length,
  }

  const rows = allRisks.map((r) => ({
    id: r.id,
    risk_number: r.risk_number ?? '—',
    title: r.title,
    category: (() => {
      const rc = r.risk_categories as { name: string } | { name: string }[] | null
      return (Array.isArray(rc) ? rc[0]?.name : (rc as { name: string } | null)?.name) ?? '—'
    })(),
    inherent_risk_score: r.inherent_risk_score ?? '—',
    inherent_risk_level: r.inherent_risk_level,
    status: r.status,
    next_review_date: r.next_review_date,
  }))

  const columns: ColDef[] = [
    { key: 'risk_number', header: 'Risk #' },
    { key: 'title', header: 'Title', cellConfig: { as: 'text_link', prefix: '/risks/' } },
    { key: 'category', header: 'Category' },
    { key: 'inherent_risk_score', header: 'Score' },
    { key: 'inherent_risk_level', header: 'Risk Level', cellConfig: { as: 'risk_pill' } },
    { key: 'status', header: 'Status', cellConfig: { as: 'tag', map: { active: 'green', under_review: 'purple', closed: 'gray', superseded: 'gray' }, transform: true } },
    { key: 'next_review_date', header: 'Next Review', cellConfig: { as: 'date' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      {/* Page header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Risk Register</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.25rem' }}>
            {allRisks.length} {allRisks.length === 1 ? 'risk' : 'risks'} total
          </p>
        </div>
        <Button kind="primary" href="/risks/new" style={{ justifyContent: 'center' }}>Add Risk</Button>
      </div>

      {/* Risk level counters */}
      <div style={{ display: 'flex', width: '100%', gap: '1px', marginBottom: '1.5rem', backgroundColor: '#e0e0e0' }}>
        {([
          { label: 'Critical', count: counts.critical, accent: '#da1e28', color: '#a2191f', bg: counts.critical > 0 ? '#fff1f1' : '#ffffff' },
          { label: 'High',     count: counts.high,     accent: '#f97316', color: '#c95000', bg: counts.high > 0 ? '#fff8f5' : '#ffffff' },
          { label: 'Medium',   count: counts.medium,   accent: '#f1c21b', color: '#b08800', bg: '#ffffff' },
          { label: 'Low',      count: counts.low,      accent: '#24a148', color: '#198038', bg: '#ffffff' },
        ] as { label: string; count: number; accent: string; color: string; bg: string }[]).map(({ label, count, accent, color, bg }) => (
          <div key={label} style={{ flex: 1, minWidth: 0, padding: '0.875rem 1.25rem', backgroundColor: bg, borderLeft: `3px solid ${accent}` }}>
            <p style={{ fontSize: '0.6875rem', color: '#6f6f6f', letterSpacing: '0.32px', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 300, color, lineHeight: 1 }}>{count}</p>
          </div>
        ))}
      </div>

      {/* Data table */}
      <Tile style={{ padding: 0 }}>
        {allRisks.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 400, color: '#161616', marginBottom: '0.5rem' }}>No risks recorded</p>
            <p style={{ fontSize: '0.875rem', color: '#6f6f6f', marginBottom: '1.5rem' }}>
              Start building your risk register by adding your first risk.
            </p>
            <Button kind="primary" href="/risks/new" style={{ justifyContent: 'center' }}>Add Risk</Button>
          </div>
        ) : (
          <DataTableClient id="risks-search" rows={rows} columns={columns} searchPlaceholder="Search risks…" />
        )}
      </Tile>
    </div>
  )
}
