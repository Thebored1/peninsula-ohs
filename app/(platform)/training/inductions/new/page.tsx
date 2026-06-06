import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { InductionForm } from './InductionForm'

export default async function NewInductionPage() {
  const supabase = await createClient()

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/training">Training</BreadcrumbItem>
            <BreadcrumbItem href="/training/inductions">Induction Programs</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Program</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>New Induction Program</h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>Define an induction program for workers, contractors, or visitors</p>
          </div>
        </Column>
      </Grid>
      <InductionForm sites={sites ?? []} />
    </div>
  )
}
