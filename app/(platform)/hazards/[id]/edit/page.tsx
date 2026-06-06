import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { EditHazardForm } from './EditForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function EditHazardPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: hazard } = await supabase
    .from('hazard_reports')
    .select('title, description, location_details, severity_perception')
    .eq('id', id)
    .single()

  if (!hazard) notFound()

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/hazards">Hazard Reports</BreadcrumbItem>
            <BreadcrumbItem href={`/hazards/${id}`}>Details</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Edit</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Edit Hazard Report</h1>
          </div>
        </Column>
      </Grid>
      <EditHazardForm id={id} initialData={hazard} />
    </div>
  )
}
