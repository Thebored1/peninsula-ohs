import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { TemplateForm } from './TemplateForm'

export default function NewHrTemplatePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/hiring">Hiring</BreadcrumbItem>
            <BreadcrumbItem href="/hiring/templates">Document Templates</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Template</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>New HR Document Template</h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>Create a custom template for offer letters, contracts, or other hiring documents.</p>
          </div>
          <TemplateForm />
        </Column>
      </Grid>
    </div>
  )
}
