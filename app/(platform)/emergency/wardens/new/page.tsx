import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { WardenForm } from './WardenForm'

export default async function NewWardenPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const [{ data: workers }, { data: sites }] = await Promise.all([
    orgId
      ? supabase.from('user_profiles').select('id, first_name, last_name, email').eq('organisation_id', orgId).order('first_name', { ascending: true })
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
            <BreadcrumbItem href="/emergency/wardens">Wardens</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Add Warden</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
              Add Emergency Warden
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Assign a worker as an emergency warden
            </p>
          </div>
        </Column>
      </Grid>
      <WardenForm workers={workers ?? []} sites={sites ?? []} />
    </div>
  )
}
