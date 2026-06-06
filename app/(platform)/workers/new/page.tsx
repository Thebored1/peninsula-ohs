import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { WorkerForm } from './WorkerForm'

export default async function NewWorkerPage() {
  const supabase = await createClient()

  const [{ data: sites }, { data: departments }] = await Promise.all([
    supabase.from('sites').select('id, name').eq('is_active', true).order('name'),
    supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/workers">Worker Profiles</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Add Worker</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Add Worker</h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Create a worker profile and system account
            </p>
          </div>
        </Column>
      </Grid>
      <WorkerForm sites={sites ?? []} departments={departments ?? []} />
    </div>
  )
}
