import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { TrainingRecordForm } from './TrainingRecordForm'

export default async function NewTrainingRecordPage() {
  const supabase = await createClient()

  const [{ data: workers }, { data: courses }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .order('last_name', { ascending: true }),
    supabase
      .from('training_courses')
      .select('id, name, validity_period_months')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/training">Training</BreadcrumbItem>
            <BreadcrumbItem href="/training/records">Training Records</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Log Training</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Log Training</h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>Record a completed training event</p>
          </div>
        </Column>
      </Grid>
      <TrainingRecordForm workers={workers ?? []} courses={courses ?? []} />
    </div>
  )
}
