'use client'

import { useState, useTransition } from 'react'
import { Button, Tag, InlineNotification } from '@carbon/react'
import { CheckmarkFilled, Time } from '@carbon/icons-react'
import { completeOnboardingTask } from '@/app/actions/hiring'

interface OnboardingTask {
  id: string
  task_title: string
  task_description: string | null
  task_type: string
  status: string
  due_date: string | null
  completed_at: string | null
}

interface Props {
  tasks: OnboardingTask[]
  assignmentId: string
}

const TYPE_LABELS: Record<string, string> = {
  acknowledge_document: 'Document',
  complete_training: 'Training',
  task: 'Task',
  meeting: 'Meeting',
  check_in: 'Check-in',
  other: 'Other',
}

const TYPE_COLOURS: Record<string, 'blue' | 'teal' | 'gray' | 'purple' | 'cyan'> = {
  acknowledge_document: 'blue',
  complete_training: 'teal',
  task: 'gray',
  meeting: 'purple',
  check_in: 'cyan',
  other: 'gray',
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function OnboardingTaskList({ tasks, assignmentId }: Props) {
  const [completing, setCompleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleComplete(taskId: string) {
    setCompleting(taskId)
    setError(null)
    startTransition(async () => {
      const result = await completeOnboardingTask(taskId)
      if (result?.error) { setError(result.error) }
      setCompleting(null)
    })
  }

  const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const done = tasks.filter(t => t.status === 'completed' || t.status === 'skipped' || t.status === 'waived')

  return (
    <div>
      {error && (
        <InlineNotification kind="error" title="Error" subtitle={error}
          onCloseButtonClick={() => setError(null)} style={{ marginBottom: '1rem', maxWidth: '100%' }} />
      )}

      {/* Progress */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#525252' }}>Progress</span>
          <span style={{ fontSize: '0.75rem', color: '#525252' }}>{done.length}/{tasks.length} tasks</span>
        </div>
        <div style={{ background: '#e0e0e0', height: '6px', borderRadius: '3px' }}>
          <div style={{
            background: done.length === tasks.length ? '#24a148' : '#0f62fe',
            height: '6px', borderRadius: '3px',
            width: tasks.length > 0 ? `${Math.round((done.length / tasks.length) * 100)}%` : '0%',
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Pending tasks */}
      {pending.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.75rem' }}>
            To Do ({pending.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pending.map(task => (
              <div
                key={task.id}
                style={{
                  display: 'flex', gap: '0.75rem', alignItems: 'center',
                  padding: '0.875rem 1rem', border: '1px solid #e0e0e0', backgroundColor: '#fff',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>{task.task_title}</span>
                    <Tag type={TYPE_COLOURS[task.task_type] ?? 'gray'} size="sm">
                      {TYPE_LABELS[task.task_type] ?? task.task_type}
                    </Tag>
                    {task.due_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#6f6f6f' }}>
                        <Time size={12} />
                        Due {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                  {task.task_description && (
                    <p style={{ fontSize: '0.8125rem', color: '#525252' }}>{task.task_description}</p>
                  )}
                </div>
                <Button
                  kind="primary"
                  size="sm"
                  disabled={isPending && completing === task.id}
                  onClick={() => handleComplete(task.id)}
                >
                  {completing === task.id ? 'Saving…' : 'Mark Complete'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {done.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.75rem' }}>
            Completed ({done.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {done.map(task => (
              <div
                key={task.id}
                style={{
                  display: 'flex', gap: '0.75rem', alignItems: 'center',
                  padding: '0.875rem 1rem', border: '1px solid #defbe6', backgroundColor: '#f6fef8',
                }}
              >
                <CheckmarkFilled size={16} style={{ color: '#24a148', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.875rem', color: '#525252', textDecoration: 'line-through' }}>{task.task_title}</span>
                  {task.completed_at && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6f6f6f' }}>
                      · {formatDate(task.completed_at)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
