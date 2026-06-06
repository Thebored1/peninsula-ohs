import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { EmergencyPlanForm } from './EmergencyPlanForm'

export default async function NewEmergencyPlanPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const [{ data: emergencyTypes }, { data: sites }] = await Promise.all([
    supabase.from('emergency_types').select('id, name, colour_code').order('display_order', { ascending: true }),
    orgId
      ? supabase.from('sites').select('id, name').eq('organisation_id', orgId).order('name', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/emergency">Emergency</BreadcrumbItem>
            <BreadcrumbItem href="/emergency/plans">Response Plans</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Plan</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
              New Emergency Response Plan
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Document procedures for responding to emergency events
            </p>
          </div>
        </Column>
      </Grid>
      <EmergencyPlanForm
        emergencyTypes={emergencyTypes ?? []}
        sites={sites ?? []}
      />
    </div>
  )
}
