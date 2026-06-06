import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import { NewButton } from '@/components/ui/NewButton'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

export default async function ComplianceCalendarPage() {
  const supabase = await createClient()

  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p style={{ color: '#6f6f6f' }}>No organisation found.</p></div>

  const { data } = await supabase
    .from('compliance_obligations')
    .select('id, title, regulatory_body, standard_reference, frequency, next_due_date, status, is_critical')
    .eq('organisation_id', orgId)
    .order('next_due_date', { ascending: true })

  const rows = (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    regulatory_body: r.regulatory_body ?? '—',
    standard_reference: r.standard_reference ?? '—',
    frequency: r.frequency ?? '—',
    next_due_date: r.next_due_date ?? null,
    status: r.status,
    is_critical: r.is_critical ?? false,
  }))

  const columns: ColDef[] = [
    {
      key: 'title',
      header: 'Title',
      cellConfig: { as: 'text_link', prefix: '/compliance-calendar/' },
    },
    { key: 'regulatory_body', header: 'Regulatory Body' },
    { key: 'standard_reference', header: 'Standard / Reference' },
    {
      key: 'frequency',
      header: 'Frequency',
      cellConfig: { as: 'transform' },
    },
    {
      key: 'next_due_date',
      header: 'Next Due Date',
      cellConfig: { as: 'due_date' },
    },
    {
      key: 'status',
      header: 'Status',
      cellConfig: {
        as: 'tag',
        map: {
          active: 'green',
          inactive: 'gray',
          superseded: 'magenta',
        },
        transform: true,
      },
    },
    {
      key: 'is_critical',
      header: 'Critical',
      cellConfig: {
        as: 'bool_tag',
        trueType: 'red',
        trueLabel: 'Critical',
        falseType: 'gray',
        falseLabel: 'No',
      },
    },
    {
      key: 'view',
      header: '',
      cellConfig: { as: 'view_link', prefix: '/compliance-calendar/' },
    },
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
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.25rem',
            }}
          >
            Compliance Calendar
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} obligation{rows.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <NewButton href="/compliance-calendar/new" label="New Obligation" />
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
            No compliance obligations registered
          </div>
        ) : (
          <DataTableClient
            id="compliance-calendar-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search obligations…"
          />
        )}
      </Tile>
    </div>
  )
}
