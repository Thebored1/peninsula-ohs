'use client'

import { useState, useTransition } from 'react'
import { Button, TextInput, Select, SelectItem, InlineNotification } from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'
import { savePreStartChecklist, type PreStartTask } from '@/app/actions/hiring'

const TASK_TYPES = [
  { value: 'task', label: 'General Task' },
  { value: 'equipment', label: 'Equipment Setup' },
  { value: 'access', label: 'System / Access' },
  { value: 'system_setup', label: 'Account Setup' },
  { value: 'training', label: 'Training' },
  { value: 'uniform', label: 'Uniform / PPE' },
  { value: 'other', label: 'Other' },
]

const DEFAULT_TASKS: PreStartTask[] = [
  { task_title: 'Collect right-to-work documents (passport / visa)', task_type: 'task', is_required: true, display_order: 0 },
  { task_title: 'Collect Social Insurance Number (SIN)', task_type: 'task', is_required: true, display_order: 1 },
  { task_title: 'Set up email and system access', task_type: 'system_setup', is_required: true, display_order: 2 },
  { task_title: 'Request equipment (laptop, phone, PPE)', task_type: 'equipment', is_required: false, display_order: 3 },
  { task_title: 'Schedule safety induction', task_type: 'training', is_required: true, display_order: 4 },
]

interface Props {
  hireId: string
  existingTasks?: PreStartTask[]
  onComplete: () => void
}

export function PreStartChecklist({ hireId, existingTasks, onComplete }: Props) {
  const [tasks, setTasks] = useState<PreStartTask[]>(existingTasks ?? DEFAULT_TASKS)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function addTask() {
    setTasks(prev => [
      ...prev,
      { task_title: '', task_type: 'task', is_required: false, display_order: prev.length },
    ])
  }

  function removeTask(index: number) {
    setTasks(prev => prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, display_order: i })))
  }

  function updateTask(index: number, patch: Partial<PreStartTask>) {
    setTasks(prev => prev.map((t, i) => i === index ? { ...t, ...patch } : t))
  }

  function handleSave() {
    setError(null)
    const valid = tasks.filter(t => t.task_title.trim())
    startTransition(async () => {
      const result = await savePreStartChecklist(hireId, valid)
      if (result?.error) { setError(result.error); return }
      onComplete()
    })
  }

  return (
    <div>
      {error && (
        <InlineNotification kind="error" title="Error" subtitle={error}
          onCloseButtonClick={() => setError(null)} style={{ marginBottom: '1rem', maxWidth: '100%' }} />
      )}

      <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1.5rem' }}>
        Define the pre-start tasks that must be completed before the employee's first day. You can add, remove, or reorder items.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {tasks.map((task, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', padding: '0.75rem', border: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
            <div style={{ flex: 2 }}>
              <TextInput
                id={`task_title_${i}`}
                labelText="Task"
                value={task.task_title}
                onChange={e => updateTask(i, { task_title: e.target.value })}
                placeholder="e.g. Set up email account"
                size="sm"
              />
            </div>
            <div style={{ flex: 1 }}>
              <Select
                id={`task_type_${i}`}
                labelText="Type"
                value={task.task_type}
                onChange={e => updateTask(i, { task_type: e.target.value })}
                size="sm"
              >
                {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value} text={t.label} />)}
              </Select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.125rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', cursor: 'pointer', color: '#525252' }}>
                <input
                  type="checkbox"
                  checked={task.is_required}
                  onChange={e => updateTask(i, { is_required: e.target.checked })}
                />
                Required
              </label>
              <Button kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan}
                iconDescription="Remove" onClick={() => removeTask(i)} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <Button kind="ghost" size="sm" renderIcon={Add} onClick={addTask}>Add Task</Button>
        <Button kind="primary" disabled={isPending} onClick={handleSave}>
          {isPending ? 'Saving…' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  )
}
