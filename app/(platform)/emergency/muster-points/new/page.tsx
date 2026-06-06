import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { MusterPointForm } from './MusterPointForm'

export default async function NewMusterPointPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data: sites } = orgId
    ? await supabase.from('sites').select('id, name').eq('organisation_id', orgId).order('name', { ascending: true })
    : { data: [] }

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/emergency">Emergency</BreadcrumbItem>
            <BreadcrumbItem href="/emergency/muster-points">Muster Points</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Add Muster Point</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
              Add Muster Point
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Define an assembly point for emergency evacuations
            </p>
          </div>
        </Column>
      </Grid>
      <MusterPointForm sites={sites ?? []} />
    </div>
  )
}
