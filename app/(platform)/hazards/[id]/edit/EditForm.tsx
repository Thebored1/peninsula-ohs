'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  Form, FormGroup, InlineNotification,
} from '@carbon/react'
import { updateHazardReport } from '@/app/actions/hazards'

interface InitialData {
  title: string
  description: string
  location_details: string | null
  severity_perception: string | null
}

interface Props {
  id: string
  initialData: InitialData
}

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export function EditHazardForm({ id, initialData }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateHazardReport(id, formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <InlineNotification kind="error" title="Error" subtitle={error} onCloseButtonClick={() => setError(null)} lowContrast />
        </div>
      )}
      <Form onSubmit={handleSubmit}>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Hazard Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput id="title" name="title" labelText="Title *" defaultValue={initialData.title} required />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="description" name="description" labelText="Description *" defaultValue={initialData.description} rows={4} required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="location_details" name="location_details" labelText="Location" defaultValue={initialData.location_details ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="severity_perception" name="severity_perception" labelText="Perceived Severity" defaultValue={initialData.severity_perception ?? 'medium'}>
                        {SEVERITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} text={o.label} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Changes'}</Button>
              <Button kind="ghost" href={`/hazards/${id}`}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
