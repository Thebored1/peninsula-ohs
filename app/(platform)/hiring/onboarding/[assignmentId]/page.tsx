import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Tile, Tag } from '@carbon/react'
import { OnboardingTaskList } from '@/components/hiring/OnboardingTaskList'

interface PageProps { params: Promise<{ assignmentId: string }> }

export default async function OnboardingAssignmentPage({ params }: PageProps) {
  const { assignmentId } = await params
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [{ data: assignment }, { data: tasks }] = await Promise.all([
    supabase
      .from('onboarding_assignments')
      .select('*, user_profiles!worker_id(first_name, last_name), onboarding_templates!template_id(name, description)')
      .eq('id', assignmentId)
      .eq('organisation_id', orgId)
      .single(),
    supabase
      .from('onboarding_task_completions')
      .select('id, status, due_date, completed_at, onboarding_template_tasks!template_task_id(task_title, task_description, task_type)')
      .eq('assignment_id', assignmentId)
      .eq('organisation_id', orgId)
      .order('created_at'),
  ])

  if (!assignment) notFound()

  const worker = Array.isArray(assignment.user_profiles) ? assignment.user_profiles[0] : assignment.user_profiles as { first_name: string; last_name: string } | null
  const template = Array.isArray(assignment.onboarding_templates) ? assignment.onboarding_templates[0] : assignment.onboarding_templates as { name: string; description: string | null } | null

  const taskList = (tasks ?? []).map(t => {
    const templateTask = Array.isArray(t.onboarding_template_tasks) ? t.onboarding_template_tasks[0] : t.onboarding_template_tasks as { task_title: string; task_description: string | null; task_type: string } | null
    return {
      id: t.id,
      task_title: templateTask?.task_title ?? '—',
      task_description: templateTask?.task_description ?? null,
      task_type: templateTask?.task_type ?? 'task',
      status: t.status,
      due_date: t.due_date,
      completed_at: t.completed_at,
    }
  })

  const workerName = worker ? `${worker.first_name} ${worker.last_name}` : '—'

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/hiring">Hiring</BreadcrumbItem>
        <BreadcrumbItem href="/hiring/onboarding">Onboarding</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{workerName}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>{workerName}</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>{template?.name ?? 'Onboarding Plan'}</p>
        </div>
        <Tag type={({ assigned: 'blue', in_progress: 'teal', completed: 'green', cancelled: 'gray' } as Record<string, 'blue'|'teal'|'green'|'gray'>)[assignment.status] ?? 'gray'}>
          {assignment.status.replace(/_/g, ' ')}
        </Tag>
      </div>

      {template?.description && (
        <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1.5rem' }}>{template.description}</p>
      )}

      <Tile style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Onboarding Tasks</h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {taskList.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>No tasks in this onboarding plan.</p>
          ) : (
            <OnboardingTaskList tasks={taskList} assignmentId={assignmentId} />
          )}
        </div>
      </Tile>
    </div>
  )
}
