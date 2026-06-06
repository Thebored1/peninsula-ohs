import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { EditIncidentForm } from './EditForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function EditIncidentPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: incident }, { data: incidentTypes }, { data: severityLevels }] = await Promise.all([
    supabase
      .from('incidents')
      .select('incident_type_id, severity_level_id, title, description, incident_date, incident_time, exact_location, immediate_actions_taken, was_injury_involved, regulatory_reportable')
      .eq('id', id)
      .single(),
    supabase.from('incident_types').select('id, name, code').eq('is_active', true).order('display_order'),
    supabase.from('severity_levels').select('id, name, level_number, colour_code').eq('is_active', true).order('level_number'),
  ])

  if (!incident) notFound()

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/incidents">Incidents</BreadcrumbItem>
            <BreadcrumbItem href={`/incidents/${id}`}>Details</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Edit</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Edit Incident</h1>
          </div>
        </Column>
      </Grid>
      <EditIncidentForm
        id={id}
        initialData={incident}
        incidentTypes={incidentTypes ?? []}
        severityLevels={severityLevels ?? []}
      />
    </div>
  )
}
