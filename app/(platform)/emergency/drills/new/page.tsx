import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { DrillForm } from './DrillForm'

export default async function NewDrillPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const [{ data: plans }, { data: sites }] = await Promise.all([
    orgId
      ? supabase.from('emergency_response_plans').select('id, plan_number, title').eq('organisation_id', orgId).eq('status', 'active').order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
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
            <BreadcrumbItem href="/emergency/drills">Drills</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Schedule Drill</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
              Schedule Emergency Drill
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Plan and record an emergency response drill
            </p>
          </div>
        </Column>
      </Grid>
      <DrillForm plans={plans ?? []} sites={sites ?? []} />
    </div>
  )
}
