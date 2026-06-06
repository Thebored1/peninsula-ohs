import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

export default async function ContractorWorkersPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('contractor_workers')
    .select(`
      id, first_name, last_name, role, induction_status, is_active,
      contractor_companies(id, company_name)
    `)
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  const rows = (data ?? []).map((w) => {
    const companyRaw = w.contractor_companies
    const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw
    return {
      id: w.id,
      full_name: `${w.first_name} ${w.last_name}`,
      company_name: company?.company_name ?? '—',
      company_id: company?.id ?? '',
      role: w.role ?? '—',
      induction_status: w.induction_status ?? 'not_inducted',
      is_active: w.is_active ?? false,
    }
  })

  const columns: ColDef[] = [
    { key: 'full_name', header: 'Name' },
    {
      key: 'company_name',
      header: 'Company',
      cellConfig: { as: 'field_link', prefix: '/contractors/', idField: 'company_id' },
    },
    { key: 'role', header: 'Role' },
    {
      key: 'induction_status',
      header: 'Induction',
      cellConfig: {
        as: 'tag',
        map: {
          not_inducted: 'gray',
          inducted: 'green',
          expired: 'red',
        },
        transform: true,
      },
    },
    {
      key: 'is_active',
      header: 'Status',
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
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/contractors">Contractors</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>All Workers</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
          Contractor Workers
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>
          {rows.length} worker{rows.length !== 1 ? 's' : ''} across all contractor companies.
          To add a worker, open the contractor company profile.
        </p>
      </div>

      <DataTableClient
        id="contractor-workers-table"
        rows={rows}
        columns={columns}
        searchPlaceholder="Search workers…"
      />
    </div>
  )
}
