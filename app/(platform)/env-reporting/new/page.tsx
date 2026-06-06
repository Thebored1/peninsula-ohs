import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { EnvReportForm } from './EnvReportForm'
import { createEnvReportSubmission } from '@/app/actions/environment'

export default async function NewEnvReportPage() {
  const supabase = await createClient()

  const { data: requirements } = await supabase
    .from('env_reporting_requirements')
    .select('id, name, regulatory_body')
    .eq('is_active', true)
    .order('name')

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/env-reporting">Environmental Reporting</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Log Submission</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Log Report Submission</h1>
          </div>
        </Column>
      </Grid>
      <EnvReportForm requirements={requirements ?? []} action={createEnvReportSubmission} />
    </div>
  )
}
