import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { EditWorkerForm } from './EditForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function EditWorkerPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: worker }, { data: sites }, { data: departments }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('first_name, last_name, email, phone, mobile, job_title, employment_type, employee_id, hire_date, primary_site_id, primary_department_id, notes, is_active')
      .eq('id', id)
      .single(),
    supabase.from('sites').select('id, name').eq('is_active', true).order('name'),
    supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
  ])

  if (!worker) notFound()

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/workers">Worker Profiles</BreadcrumbItem>
            <BreadcrumbItem href={`/workers/${id}`}>{worker.first_name} {worker.last_name}</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Edit</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Edit Worker Profile</h1>
          </div>
        </Column>
      </Grid>
      <EditWorkerForm id={id} initialData={worker} sites={sites ?? []} departments={departments ?? []} />
    </div>
  )
}
