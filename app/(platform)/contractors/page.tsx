import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ContractorsPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('contractor_companies')
    .select('id, company_name, abn, primary_contact_name, prequalification_status, prequalification_expiry, is_active, created_at')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  const rows = (data ?? []).map((r) => ({
    id: r.id,
    company_name: r.company_name,
    abn: r.abn ?? '—',
    primary_contact_name: r.primary_contact_name ?? '—',
    prequalification_status: r.prequalification_status ?? 'pending',
    prequalification_expiry: r.prequalification_expiry ?? null,
    is_active: r.is_active,
  }))

  const columns: ColDef[] = [
    {
      key: 'company_name',
      header: 'Company',
      cellConfig: { as: 'text_link', prefix: '/contractors/' },
    },
    { key: 'abn', header: 'ABN' },
    { key: 'primary_contact_name', header: 'Primary Contact' },
    {
      key: 'prequalification_status',
      header: 'Prequalification',
      cellConfig: {
        as: 'tag',
        map: {
          approved: 'green',
          pending: 'blue',
          conditionally_approved: 'teal',
          suspended: 'red',
          expired: 'gray',
        },
        transform: true,
      },
    },
    {
      key: 'prequalification_expiry',
      header: 'Expiry',
      cellConfig: { as: 'due_date' },
    },
    {
      key: 'is_active',
      header: 'Active',
      cellConfig: {
        as: 'bool_tag',
        trueType: 'green',
        trueLabel: 'Active',
        falseType: 'gray',
        falseLabel: 'Inactive',
      },
    },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Contractors
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} contractor{rows.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a
            href="/contractors/workers"
            style={{
              fontSize: '0.875rem',
              color: '#0f62fe',
              textDecoration: 'none',
              padding: '0.5rem 0.75rem',
              border: '1px solid #0f62fe',
              borderRadius: '2px',
            }}
          >
            All Workers
          </a>
          <a
            href="/contractors/access-log"
            style={{
              fontSize: '0.875rem',
              color: '#0f62fe',
              textDecoration: 'none',
              padding: '0.5rem 0.75rem',
              border: '1px solid #0f62fe',
              borderRadius: '2px',
            }}
          >
            Site Access Log
          </a>
          <NewButton href="/contractors/new" label="Add Contractor" />
        </div>
      </div>

      <DataTableClient
        id="contractors-table"
        rows={rows}
        columns={columns}
        searchPlaceholder="Search contractors…"
      />
    </div>
  )
}
