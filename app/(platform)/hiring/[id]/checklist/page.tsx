import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Tile } from '@carbon/react'
import { PreStartChecklist } from '@/components/hiring/PreStartChecklist'

interface PageProps { params: Promise<{ id: string }> }

export default async function HireChecklistPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [{ data: hire }, { data: tasks }] = await Promise.all([
    supabase.from('hires').select('hire_number, candidate_first_name, candidate_last_name, checklist_completed').eq('id', id).eq('organisation_id', orgId).single(),
    supabase.from('hire_prestart_tasks').select('*').eq('hire_id', id).eq('organisation_id', orgId).order('display_order'),
  ])

  if (!hire) notFound()

  const candidateName = `${hire.candidate_first_name ?? ''} ${hire.candidate_last_name ?? ''}`.trim()

  // Convert DB tasks to PreStartTask shape
  const existingTasks = (tasks ?? []).map(t => ({
    task_title: t.task_title,
    task_type: t.task_type,
    is_required: t.is_required,
    display_order: t.display_order,
  }))

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/hiring">Hiring</BreadcrumbItem>
        <BreadcrumbItem href={`/hiring/${id}`}>{hire.hire_number ?? candidateName}</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Pre-Start Checklist</BreadcrumbItem>
      </Breadcrumb>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Pre-Start Checklist</h1>
      <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '2rem' }}>{candidateName}</p>

      <Tile style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Tasks before first day</h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <PreStartChecklist
            hireId={id}
            existingTasks={existingTasks.length > 0 ? existingTasks : undefined}
            onComplete={() => {}}
          />
        </div>
      </Tile>
    </div>
  )
}
