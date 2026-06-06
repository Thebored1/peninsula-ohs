import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { RegulatoryForm } from './RegulatoryForm'
import { createRegulatory } from '@/app/actions/regulatory'

export default async function NewRegulatoryPage() {
  const supabase = await createClient()

  const { data: regulatoryBodies } = await supabase
    .from('regulatory_bodies')
    .select('id, name')
    .order('name')

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/regulatory">Regulatory Library</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Add Standard</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Add Standard</h1>
          </div>
        </Column>
      </Grid>
      <RegulatoryForm regulatoryBodies={regulatoryBodies ?? []} action={createRegulatory} />
    </div>
  )
}
