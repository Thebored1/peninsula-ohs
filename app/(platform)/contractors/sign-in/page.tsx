import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { SignInForm } from './SignInForm'

export default async function SignInPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [{ data: workersData }, { data: sitesData }] = await Promise.all([
    supabase
      .from('contractor_workers')
      .select(`
        id, first_name, last_name, role,
        contractor_companies(company_name)
      `)
      .eq('organisation_id', orgId)
      .eq('is_active', true)
      .order('first_name'),
    supabase
      .from('sites')
      .select('id, name')
      .eq('organisation_id', orgId)
      .eq('is_active', true)
      .order('name'),
  ])

  const workers = (workersData ?? []).map((w) => {
    const companyRaw = w.contractor_companies
    const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw
    return {
      id: w.id,
      first_name: w.first_name,
      last_name: w.last_name,
      role: w.role ?? null,
      company_name: company?.company_name ?? '—',
    }
  })

  const sites = (sitesData ?? []).map((s) => ({ id: s.id, name: s.name }))

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/contractors">Contractors</BreadcrumbItem>
            <BreadcrumbItem href="/contractors/access-log">Site Access Log</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Sign In Contractor</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
              Sign In Contractor
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Record a contractor worker arriving on site
            </p>
          </div>
        </Column>
      </Grid>
      <SignInForm workers={workers} sites={sites} />
    </div>
  )
}
