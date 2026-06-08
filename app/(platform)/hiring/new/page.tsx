import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { HiringWizard } from '@/components/hiring/HiringWizard'
import { getHrTemplates } from '@/app/actions/hiring'

export default async function NewHirePage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [
    { data: sites },
    { data: departments },
    { data: workers },
    templates,
  ] = await Promise.all([
    supabase.from('sites').select('id, name').eq('organisation_id', orgId).eq('is_active', true).order('name'),
    supabase.from('departments').select('id, name').eq('organisation_id', orgId).order('name'),
    supabase.from('user_profiles').select('id, first_name, last_name').eq('organisation_id', orgId).eq('is_active', true).order('first_name'),
    getHrTemplates(),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/hiring">Hiring</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>New Hire</BreadcrumbItem>
      </Breadcrumb>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>New Hire</h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>Complete all steps to create a compliant, documented hiring record.</p>
      </div>
      <HiringWizard
        sites={sites ?? []}
        departments={departments ?? []}
        workers={workers ?? []}
        hrTemplates={templates}
      />
    </div>
  )
}
