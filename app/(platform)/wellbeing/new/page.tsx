import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { WellbeingResourceForm } from './WellbeingResourceForm'

export default async function NewWellbeingResourcePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user!.id)
    .single()

  const [{ data: sites }, { data: departments }] = await Promise.all([
    supabase
      .from('sites')
      .select('id, name')
      .eq('organisation_id', profile!.organisation_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('departments')
      .select('id, name')
      .eq('organisation_id', profile!.organisation_id)
      .order('name'),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/wellbeing">Mental Health &amp; Wellbeing</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Add Resource</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
              Add Wellbeing Resource
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Add an EAP provider, helpline, internal support contact, policy, app, or article
            </p>
          </div>
        </Column>
      </Grid>
      <WellbeingResourceForm
        sites={sites ?? []}
        departments={departments ?? []}
      />
    </div>
  )
}
