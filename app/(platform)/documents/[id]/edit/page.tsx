import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { EditDocumentForm } from './EditForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function EditDocumentPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: doc }, { data: docTypes }, { data: docStatuses }] = await Promise.all([
    supabase
      .from('documents')
      .select('title, document_type_id, status_id, description, review_due_date, version')
      .eq('id', id)
      .single(),
    supabase.from('document_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('document_statuses').select('id, name').order('name'),
  ])

  if (!doc) notFound()

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/documents">Documents</BreadcrumbItem>
            <BreadcrumbItem href={`/documents/${id}`}>Details</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Edit</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Edit Document</h1>
          </div>
        </Column>
      </Grid>
      <EditDocumentForm id={id} initialData={doc} docTypes={docTypes ?? []} docStatuses={docStatuses ?? []} />
    </div>
  )
}
