import { createClient } from '@/lib/supabase/server'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function truncate(text: string, maxLen = 80) {
  if (!text) return '—'
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

export default async function SpeakUpPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user!.id)
    .single()

  const [{ data: reports }, { data: categories }] = await Promise.all([
    supabase
      .from('speak_up_reports')
      .select('id, report_number, category_id, description, severity, status, created_at, speak_up_categories(name)')
      .eq('organisation_id', profile!.organisation_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('speak_up_categories')
      .select('id, name')
      .eq('organisation_id', profile!.organisation_id)
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  // Build category counts for summary bar
  const categoryCounts: Record<string, number> = {}
  for (const r of reports ?? []) {
    if (r.category_id) {
      categoryCounts[r.category_id] = (categoryCounts[r.category_id] ?? 0) + 1
    }
  }

  const statusCounts = {
    received: 0,
    under_review: 0,
    investigating: 0,
    resolved: 0,
    closed: 0,
  } as Record<string, number>
  for (const r of reports ?? []) {
    if (r.status && Object.prototype.hasOwnProperty.call(statusCounts, r.status)) {
      statusCounts[r.status]++
    }
  }

  const rows = (reports ?? []).map((r) => {
    const catRaw = r.speak_up_categories
    const cat = Array.isArray(catRaw)
      ? (catRaw[0] as { name: string } | undefined) ?? null
      : (catRaw as { name: string } | null)
    return {
      id: r.id,
      report_number: r.report_number ?? '—',
      category: cat?.name ?? '—',
      description: truncate(r.description ?? ''),
      severity: r.severity ?? '—',
      status: r.status ?? '—',
      created_at: r.created_at ? formatDate(r.created_at) : '—',
    }
  })

  const columns: ColDef[] = [
    { key: 'report_number', header: 'Report #' },
    { key: 'category', header: 'Category' },
    { key: 'description', header: 'Description' },
    {
      key: 'severity',
      header: 'Severity',
      cellConfig: {
        as: 'tag',
        map: { low: 'green', medium: 'blue', high: 'magenta', critical: 'red' },
        transform: true,
      },
    },
    {
      key: 'status',
      header: 'Status',
      cellConfig: {
        as: 'tag',
        map: {
          received: 'blue',
          under_review: 'cyan',
          investigating: 'purple',
          resolved: 'teal',
          closed: 'green',
        },
        transform: true,
      },
    },
    { key: 'created_at', header: 'Submitted' },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/speak-up/' } },
  ]

  const summaryItems = [
    { label: 'Total', value: rows.length, color: '#161616' },
    { label: 'Received', value: statusCounts.received, color: '#0f62fe' },
    { label: 'Under Review', value: statusCounts.under_review, color: '#007d79' },
    { label: 'Investigating', value: statusCounts.investigating, color: '#8a3ffc' },
    { label: 'Resolved', value: statusCounts.resolved, color: '#24a148' },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      {/* Page header */}
      <div
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.25rem',
            }}
          >
            Anonymous Speak-Up Reports
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            Confidential concern and misconduct reports submitted by workers
          </p>
        </div>
        <Button kind="primary" href="/speak-up/new" style={{ justifyContent: 'center' }}>
          Submit Report
        </Button>
      </div>

      {/* Summary bar */}
      <div
        style={{
          display: 'flex',
          gap: '1px',
          marginBottom: '1.5rem',
          backgroundColor: '#e0e0e0',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        {summaryItems.map((item) => (
          <div
            key={item.label}
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              padding: '1rem 1.25rem',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: item.color,
                marginBottom: '0.125rem',
                lineHeight: 1,
              }}
            >
              {item.value}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#525252' }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {(categories ?? []).length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {(categories ?? []).map((cat) => {
            const count = categoryCounts[cat.id] ?? 0
            return (
              <div
                key={cat.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.25rem 0.75rem',
                  backgroundColor: '#f4f4f4',
                  border: '1px solid #e0e0e0',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  color: '#525252',
                }}
              >
                <span>{cat.name}</span>
                {count > 0 && (
                  <span
                    style={{
                      backgroundColor: '#0f62fe',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '1.125rem',
                      height: '1.125rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                    }}
                  >
                    {count}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
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
            No speak-up reports submitted yet
          </div>
        ) : (
          <DataTableClient
            id="speak-up-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search reports…"
          />
        )}
      </Tile>
    </div>
  )
}
