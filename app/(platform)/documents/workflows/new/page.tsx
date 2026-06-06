import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { WorkflowForm } from './WorkflowForm'

export default async function NewWorkflowPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data: roles } = orgId
    ? await supabase
        .from('roles')
        .select('id, name')
        .eq('organisation_id', orgId)
        .order('name')
    : { data: [] }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/documents">Documents</BreadcrumbItem>
        <BreadcrumbItem href="/documents/workflows">Review Workflows</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>New Workflow</BreadcrumbItem>
      </Breadcrumb>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>
          New Review Workflow
        </h1>
      </div>
      <WorkflowForm roles={roles ?? []} />
    </div>
  )
}
