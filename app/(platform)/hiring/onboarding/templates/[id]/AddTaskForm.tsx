'use client'

import { useState, useTransition } from 'react'
import { Grid, Column, Button, TextInput, TextArea, Select, SelectItem, InlineNotification } from '@carbon/react'
import { addOnboardingTemplateTask } from '@/app/actions/hiring'

const TASK_TYPES = [
  { value: 'task', label: 'General Task' },
  { value: 'acknowledge_document', label: 'Acknowledge Document' },
  { value: 'complete_training', label: 'Complete Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'check_in', label: 'Check-In' },
  { value: 'other', label: 'Other' },
]

export function AddTaskForm({ templateId }: { templateId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isRequired, setIsRequired] = useState(true)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('is_required', isRequired ? 'true' : 'false')
    startTransition(async () => {
      const result = await addOnboardingTemplateTask(templateId, formData)
      if (result?.error) { setError(result.error); return }
      ;(e.target as HTMLFormElement).reset()
      setIsRequired(true)
    })
  }

  return (
    <div>
      {error && (
        <InlineNotification kind="error" title="Error" subtitle={error}
          onCloseButtonClick={() => setError(null)} style={{ marginBottom: '1rem', maxWidth: '100%' }} />
      )}
      <form onSubmit={handleSubmit}>
        <Grid condensed>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
            <TextInput id="task_title" name="task_title" labelText="Task Title *" required placeholder="e.g. Read and sign the Code of Conduct" />
          </Column>
          <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
            <Select id="task_type" name="task_type" labelText="Task Type" defaultValue="task">
              {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value} text={t.label} />)}
            </Select>
          </Column>
          <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
            <TextInput id="due_days_from_start" name="due_days_from_start" labelText="Due (days from start)" type="number" min="0" helperText="e.g. 1 = day one, 7 = first week" />
          </Column>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
            <TextArea id="task_description" name="task_description" labelText="Description (optional)" rows={2} />
          </Column>
          <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} style={{ cursor: 'pointer' }} />
              Required task
            </label>
          </Column>
        </Grid>
        <Button type="submit" kind="secondary" size="sm" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add Task'}
        </Button>
      </form>
    </div>
  )
}
