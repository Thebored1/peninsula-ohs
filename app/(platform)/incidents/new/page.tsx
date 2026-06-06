import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { IncidentForm } from './IncidentForm'

export default async function NewIncidentPage() {
  const supabase = await createClient()

  const [{ data: incidentTypes }, { data: severityLevels }] = await Promise.all([
    supabase
      .from('incident_types')
      .select('id, name, code')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('severity_levels')
      .select('id, name, level_number, colour_code')
      .eq('is_active', true)
      .order('level_number', { ascending: true }),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/incidents">Incidents</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Report Incident</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
              Report Incident
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Complete all required fields
            </p>
          </div>
        </Column>
      </Grid>
      <IncidentForm
        incidentTypes={incidentTypes ?? []}
        severityLevels={severityLevels ?? []}
      />
    </div>
  )
}
