import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

export default async function PackagesPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data: packages } = await supabase
    .from('bgc_packages')
    .select('id, package_number, candidate_first_name, candidate_last_name, position_title, status, province, created_at')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (packages ?? []).map(p => ({
    id: p.id,
    package_number: p.package_number ?? '—',
    candidate_name: `${p.candidate_first_name ?? ''} ${p.candidate_last_name ?? ''}`.trim() || '—',
    position_title: p.position_title ?? '—',
    province: p.province ?? '—',
    status: p.status,
    created_at: p.created_at,
  }))

  const columns: ColDef[] = [
    { key: 'package_number', header: 'Package #' },
    { key: 'candidate_name', header: 'Candidate' },
    { key: 'position_title', header: 'Position' },
    { key: 'province', header: 'Province' },
    { key: 'status', header: 'Status', cellConfig: {
      as: 'tag',
      map: {
        draft: 'gray', consent_pending: 'gray', consent_given: 'teal',
        ordering: 'blue', in_progress: 'blue', review_pending: 'red',
        adjudicated: 'purple', complete: 'green', withdrawn: 'gray',
      },
      transform: true,
    }},
    { key: 'created_at', header: 'Created', cellConfig: { as: 'date' } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/background-checks/packages/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1rem' }}>
        <BreadcrumbItem href="/background-checks">Background Checks</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>All Packages</BreadcrumbItem>
      </Breadcrumb>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>All Packages</h1>
      <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '2rem' }}>
        Background check packages are created automatically from the hiring workflow.
      </p>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No packages yet. Background check packages are created when initiating a background check during the hiring workflow.
          </div>
        ) : (
          <DataTableClient id="all-packages-table" rows={rows} columns={columns} searchPlaceholder="Search packages…" />
        )}
      </Tile>
    </div>
  )
}
