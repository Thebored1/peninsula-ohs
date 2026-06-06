import { createClient } from '@/lib/supabase/server'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function PpePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user!.id)
    .single()

  // Fetch issuances joined with worker and ppe_item -> ppe_type
  const { data: issuances } = await supabase
    .from('ppe_issuances')
    .select(
      `id, issued_date, expected_return_date, returned_date, status, condition_on_issue,
       worker:worker_id(id, first_name, last_name),
       ppe_item:ppe_item_id(id, brand, model, size, ppe_type:ppe_type_id(name))`
    )
    .eq('organisation_id', profile!.organisation_id)
    .order('created_at', { ascending: false })

  const rows = (issuances ?? []).map((r) => {
    const worker = Array.isArray(r.worker)
      ? (r.worker[0] as { id: string; first_name: string; last_name: string } | undefined) ?? null
      : (r.worker as { id: string; first_name: string; last_name: string } | null)

    const ppeItem = Array.isArray(r.ppe_item)
      ? (r.ppe_item[0] as { id: string; brand: string | null; model: string | null; size: string | null; ppe_type: { name: string } | { name: string }[] | null } | undefined) ?? null
      : (r.ppe_item as { id: string; brand: string | null; model: string | null; size: string | null; ppe_type: { name: string } | { name: string }[] | null } | null)

    const ppeTypeRaw = ppeItem?.ppe_type ?? null
    const ppeType = Array.isArray(ppeTypeRaw)
      ? (ppeTypeRaw[0] as { name: string } | undefined) ?? null
      : (ppeTypeRaw as { name: string } | null)

    const workerName = worker ? `${worker.first_name} ${worker.last_name}` : '—'
    const ppeName = ppeType?.name ?? '—'
    const itemLabel = [ppeItem?.brand, ppeItem?.model, ppeItem?.size].filter(Boolean).join(' ')

    return {
      id: r.id,
      worker_name: workerName,
      ppe_type: ppeName,
      item_detail: itemLabel || ppeName,
      issued_date: r.issued_date ?? null,
      expected_return_date: r.expected_return_date ?? null,
      status: r.status ?? 'issued',
    }
  })

  // Summary counts
  const issuedCount = rows.filter((r) => r.status === 'issued').length
  const returnedCount = rows.filter((r) => r.status === 'returned').length
  const overdueCount = rows.filter((r) => {
    if (r.status !== 'issued') return false
    if (!r.expected_return_date) return false
    return new Date(r.expected_return_date) < new Date()
  }).length

  const columns: ColDef[] = [
    { key: 'worker_name', header: 'Worker' },
    { key: 'ppe_type', header: 'PPE Type' },
    { key: 'item_detail', header: 'Item' },
    {
      key: 'issued_date',
      header: 'Issued Date',
      cellConfig: { as: 'date' },
    },
    {
      key: 'expected_return_date',
      header: 'Expected Return',
      cellConfig: { as: 'due_date' },
    },
    {
      key: 'status',
      header: 'Status',
      cellConfig: {
        as: 'tag',
        map: {
          issued: 'blue',
          returned: 'green',
          lost: 'red',
          damaged: 'magenta',
        },
        transform: true,
      },
    },
    {
      key: 'view',
      header: '',
      cellConfig: { as: 'view_link', prefix: '/ppe/' },
    },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      {/* Page header */}
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
            PPE Issuances
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} record{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button kind="primary" href="/ppe/new" style={{ justifyContent: 'center' }}>
          Issue PPE
        </Button>
      </div>

      {/* Summary tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <Tile style={{ padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Currently Issued
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 300, color: '#0f62fe', lineHeight: 1 }}>
            {issuedCount}
          </p>
        </Tile>
        <Tile style={{ padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Returned
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 300, color: '#24a148', lineHeight: 1 }}>
            {returnedCount}
          </p>
        </Tile>
        <Tile style={{ padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Overdue Returns
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 300, color: overdueCount > 0 ? '#da1e28' : '#161616', lineHeight: 1 }}>
            {overdueCount}
          </p>
        </Tile>
      </div>

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
            No PPE issuances recorded
          </div>
        ) : (
          <DataTableClient
            id="ppe-issuances-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search issuances…"
          />
        )}
      </Tile>
    </div>
  )
}
