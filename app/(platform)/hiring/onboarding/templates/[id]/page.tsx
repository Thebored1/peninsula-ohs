import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Tile, Tag } from '@carbon/react'
import Link from 'next/link'
import { AddTaskForm } from './AddTaskForm'

interface PageProps { params: Promise<{ id: string }> }

const TASK_TYPE_COLOURS: Record<string, 'blue' | 'teal' | 'gray' | 'purple' | 'cyan'> = {
  acknowledge_document: 'blue', complete_training: 'teal', task: 'gray',
  meeting: 'purple', check_in: 'cyan', other: 'gray',
}

export default async function OnboardingTemplateDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [{ data: template }, { data: tasks }] = await Promise.all([
    supabase.from('onboarding_templates').select('*').eq('id', id).eq('organisation_id', orgId).single(),
    supabase.from('onboarding_template_tasks').select('*').eq('template_id', id).eq('organisation_id', orgId).order('display_order'),
  ])

  if (!template) notFound()

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/hiring">Hiring</BreadcrumbItem>
        <BreadcrumbItem href="/hiring/onboarding/templates">Onboarding Templates</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{template.name}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>{template.name}</h1>
          {template.description && (
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>{template.description}</p>
          )}
        </div>
        <Tag type={template.is_active ? 'green' : 'gray'} size="sm">
          {template.is_active ? 'Active' : 'Inactive'}
        </Tag>
      </div>

      {/* Task list */}
      <Tile style={{ padding: 0, marginBottom: '1rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
            Tasks ({(tasks ?? []).length})
          </h2>
        </div>
        {(!tasks || tasks.length === 0) ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No tasks yet. Add tasks below.
          </div>
        ) : (
          <div>
            {tasks.map((task, i) => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.875rem 1.5rem',
                borderBottom: i < tasks.length - 1 ? '1px solid #f4f4f4' : 'none',
              }}>
                <span style={{ fontSize: '0.75rem', color: '#6f6f6f', fontWeight: 600, minWidth: '1.5rem' }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.125rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>{task.task_title}</span>
                    <Tag type={TASK_TYPE_COLOURS[task.task_type] ?? 'gray'} size="sm">
                      {task.task_type.replace(/_/g, ' ')}
                    </Tag>
                    {!task.is_required && <Tag type="gray" size="sm">Optional</Tag>}
                    {task.due_days_from_start != null && (
                      <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                        Due: day {task.due_days_from_start}
                      </span>
                    )}
                  </div>
                  {task.task_description && (
                    <p style={{ fontSize: '0.8125rem', color: '#525252' }}>{task.task_description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Tile>

      {/* Add task form */}
      <Tile style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Add Task</h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <AddTaskForm templateId={id} />
        </div>
      </Tile>
    </div>
  )
}
