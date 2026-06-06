import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { EditActionForm } from './EditForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function EditActionPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: action }, { data: workers }] = await Promise.all([
    supabase
      .from('actions')
      .select('title, description, action_type, priority, due_date, assigned_to, verification_required, source_reference')
      .eq('id', id)
      .single(),
    supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email')
      .eq('is_active', true)
      .order('last_name'),
  ])

  if (!action) notFound()

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/actions">Actions</BreadcrumbItem>
            <BreadcrumbItem href={`/actions/${id}`}>Details</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Edit</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Edit Action</h1>
          </div>
        </Column>
      </Grid>
      <EditActionForm id={id} initialData={action} workers={workers ?? []} />
    </div>
  )
}
