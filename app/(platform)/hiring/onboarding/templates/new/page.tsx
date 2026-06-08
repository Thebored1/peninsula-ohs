import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { OnboardingTemplateForm } from './OnboardingTemplateForm'

export default function NewOnboardingTemplatePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/hiring">Hiring</BreadcrumbItem>
            <BreadcrumbItem href="/hiring/onboarding/templates">Onboarding Templates</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Template</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>New Onboarding Template</h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>Define a reusable onboarding checklist for new employees.</p>
          </div>
          <OnboardingTemplateForm />
        </Column>
      </Grid>
    </div>
  )
}
