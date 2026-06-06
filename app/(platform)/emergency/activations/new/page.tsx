import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { ActivationForm } from './ActivationForm'

export default async function NewActivationPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const [{ data: sites }, { data: plans }, { data: emergencyTypes }] = await Promise.all([
    orgId
      ? supabase.from('sites').select('id, name').eq('organisation_id', orgId).order('name', { ascending: true })
      : Promise.resolve({ data: [] }),
    orgId
      ? supabase.from('emergency_response_plans').select('id, plan_number, title').eq('organisation_id', orgId).eq('status', 'active').order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('emergency_types').select('id, name, colour_code').order('display_order', { ascending: true }),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/emergency">Emergency</BreadcrumbItem>
            <BreadcrumbItem href="/emergency/activations">Activations</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Activate Emergency</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fff1f1',
              border: '1px solid #da1e28',
              borderLeft: '4px solid #da1e28',
              marginBottom: '1.5rem',
            }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#da1e28' }}>
                EMERGENCY ACTIVATION — Use this form only during an active emergency
              </p>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
              Activate Emergency
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Record an emergency activation and initiate response
            </p>
          </div>
        </Column>
      </Grid>
      <ActivationForm sites={sites ?? []} plans={plans ?? []} emergencyTypes={emergencyTypes ?? []} />
    </div>
  )
}
