'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, FormGroup, Toggle, InlineNotification,
} from '@carbon/react'
import { updateAction } from '@/app/actions/action-items'

interface Worker { id: string; first_name: string; last_name: string; email: string }

interface InitialData {
  title: string
  description: string
  action_type: string
  priority: string
  due_date: string
  assigned_to: string | null
  verification_required: boolean
  source_reference: string | null
}

interface Props {
  id: string
  initialData: InitialData
  workers: Worker[]
}

const ACTION_TYPES = ['corrective', 'preventive', 'improvement', 'regulatory', 'other']
const PRIORITIES = ['low', 'medium', 'high', 'critical']

export function EditActionForm({ id, initialData, workers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [verificationRequired, setVerificationRequired] = useState(initialData.verification_required)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('verification_required', String(verificationRequired))
    startTransition(async () => {
      const result = await updateAction(id, formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <InlineNotification kind="error" title="Error" subtitle={error} onCloseButtonClick={() => setError(null)} style={{ marginBottom: '1.5rem', maxWidth: '100%' }} />
      )}
      <Form onSubmit={handleSubmit}>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Action Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput id="title" name="title" labelText="Title *" defaultValue={initialData.title} required />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="description" name="description" labelText="Description *" defaultValue={initialData.description} rows={3} required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="action_type" name="action_type" labelText="Action Type *" defaultValue={initialData.action_type} required>
                        {ACTION_TYPES.map((t) => <SelectItem key={t} value={t} text={t.charAt(0).toUpperCase() + t.slice(1)} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="priority" name="priority" labelText="Priority" defaultValue={initialData.priority}>
                        {PRIORITIES.map((p) => <SelectItem key={p} value={p} text={p.charAt(0).toUpperCase() + p.slice(1)} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="due_date" name="due_date" labelText="Due Date *" type="date" defaultValue={initialData.due_date} required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="assigned_to" name="assigned_to" labelText="Assigned To" defaultValue={initialData.assigned_to ?? ''}>
                        <SelectItem value="" text="Unassigned" />
                        {workers.map((w) => <SelectItem key={w.id} value={w.id} text={`${w.first_name} ${w.last_name}`} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="source_reference" name="source_reference" labelText="Source Reference" defaultValue={initialData.source_reference ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem' }}>Verification required?</p>
                    <Toggle id="verification_required" labelA="No" labelB="Yes" toggled={verificationRequired} onToggle={(c: boolean) => setVerificationRequired(c)} hideLabel />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Changes'}</Button>
              <Button kind="ghost" href={`/actions/${id}`}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
