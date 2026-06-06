import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { InspectionForm } from './InspectionForm'
import { createInspection } from '@/app/actions/inspections'

export default async function NewInspectionPage() {
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('inspection_templates')
    .select(`
      id, name, description, estimated_duration_minutes, passing_score_threshold,
      inspection_types(name)
    `)
    .eq('is_published', true)
    .eq('is_active', true)
    .order('name')

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/inspections">Inspections</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Start Inspection</BreadcrumbItem>
          </Breadcrumb>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '2rem',
            }}
          >
            Start Inspection
          </h1>
        </Column>
      </Grid>
      <InspectionForm templates={templates ?? []} action={createInspection} />
    </div>
  )
}
