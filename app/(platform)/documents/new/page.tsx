import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { DocumentForm } from './DocumentForm'
import { createDocument } from '@/app/actions/documents'

export const dynamic = 'force-dynamic'

export default async function NewDocumentPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: docTypes }, { data: docStatuses }, { data: profile }] = await Promise.all([
    supabase.from('document_types').select('id, name').eq('is_active', true).order('display_order'),
    supabase.from('document_statuses').select('id, name').eq('is_active', true).order('display_order'),
    user
      ? supabase.from('user_profiles').select('organisation_id').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const { data: users } = profile?.organisation_id
    ? await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .eq('organisation_id', profile.organisation_id)
        .eq('is_active', true)
        .order('first_name')
    : { data: [] }

  const { data: workflows } = profile?.organisation_id
    ? await supabase
        .from('document_review_workflows')
        .select('id, name, is_default')
        .eq('organisation_id', profile.organisation_id)
        .eq('is_active', true)
        .order('name')
    : { data: [] }

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/documents">Documents</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Add Document</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Add Document</h1>
          </div>
        </Column>
      </Grid>
      <DocumentForm
        docTypes={docTypes ?? []}
        docStatuses={docStatuses ?? []}
        users={users ?? []}
        workflows={workflows ?? []}
        action={createDocument}
      />
    </div>
  )
}
