import { Grid, Column, Breadcrumb, BreadcrumbItem } from '@carbon/react'
import ReportBuilderForm from './ReportBuilderForm'

export default async function NewReportPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/reports">Reports</BreadcrumbItem>
            <BreadcrumbItem href="/reports/builder">Report Builder</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Report</BreadcrumbItem>
          </Breadcrumb>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '2rem' }}>
            New Report Definition
          </h1>
        </Column>
      </Grid>
      <ReportBuilderForm />
    </div>
  )
}
