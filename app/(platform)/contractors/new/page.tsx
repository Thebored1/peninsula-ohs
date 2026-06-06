import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { ContractorForm } from './ContractorForm'

export default function NewContractorPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/contractors">Contractors</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Add Contractor</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
              Add Contractor
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Register a new contractor company for prequalification
            </p>
          </div>
        </Column>
      </Grid>
      <ContractorForm />
    </div>
  )
}
