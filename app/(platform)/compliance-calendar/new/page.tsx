import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { ComplianceCalendarForm } from './ComplianceCalendarForm'

export default async function NewComplianceCalendarPage() {
  const supabase = await createClient()

  const { data: obligationTypes } = await supabase
    .from('compliance_obligation_types')
    .select('id, name, colour_code')
    .order('display_order', { ascending: true })

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/compliance-calendar">Compliance Calendar</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Obligation</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 400,
                color: '#161616',
                marginBottom: '0.25rem',
              }}
            >
              New Compliance Obligation
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Register a recurring compliance requirement
            </p>
          </div>
        </Column>
      </Grid>
      <ComplianceCalendarForm obligationTypes={obligationTypes ?? []} />
    </div>
  )
}
