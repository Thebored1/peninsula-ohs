'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextArea, Select, SelectItem,
  Form, FormGroup, TextInput, InlineNotification,
} from '@carbon/react'
import { updateInvestigation } from '@/app/actions/investigations'

interface Worker { id: string; first_name: string; last_name: string }

interface InitialData {
  status: string
  due_date: string | null
  investigation_summary: string | null
  findings: string | null
  root_cause: string | null
}

interface Props {
  id: string
  initialData: InitialData
  workers: Worker[]
}

const STATUSES = ['open', 'in_progress', 'completed', 'closed', 'cancelled']

export function EditInvestigationForm({ id, initialData, workers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateInvestigation(id, formData)
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Investigation Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="status" name="status" labelText="Status" defaultValue={initialData.status}>
                        {STATUSES.map((s) => <SelectItem key={s} value={s} text={s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="due_date" name="due_date" labelText="Due Date" type="date" defaultValue={initialData.due_date ?? ''} />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="investigation_summary" name="investigation_summary" labelText="Investigation Summary" defaultValue={initialData.investigation_summary ?? ''} rows={4} />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="findings" name="findings" labelText="Findings" defaultValue={initialData.findings ?? ''} rows={4} />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="root_cause" name="root_cause" labelText="Root Cause" defaultValue={initialData.root_cause ?? ''} rows={3} />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Changes'}</Button>
              <Button kind="ghost" href={`/investigations/${id}`}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
