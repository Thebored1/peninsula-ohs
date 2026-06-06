'use client'

import { useState } from 'react'
import {
  Grid, Column, Button, TextInput, TextArea, FormGroup, InlineNotification,
} from '@carbon/react'
import { completeDrill } from '@/app/actions/emergency'

interface Props {
  drillId: string
}

export function CompleteDrillForm({ drillId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData(e.currentTarget)
      fd.set('id', drillId)
      const result = await completeDrill(fd)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      } else {
        setSuccess(true)
        setLoading(false)
      }
    } catch {
      setError('An unexpected error occurred.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#24a148', fontSize: '0.875rem' }}>
        Drill completed successfully. Refresh the page to see updated details.
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <InlineNotification kind="error" title="Error" subtitle={error} onCloseButtonClick={() => setError(null)} lowContrast />
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <Grid condensed>
          <Column sm={4} md={4} lg={8}>
            <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
              <TextInput id="actual_date" name="actual_date" labelText="Actual Date" type="date" required />
            </FormGroup>
          </Column>
          <Column sm={4} md={4} lg={4}>
            <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
              <TextInput id="participants_count" name="participants_count" labelText="Participants" type="number" min="0" />
            </FormGroup>
          </Column>
          <Column sm={4} md={4} lg={4}>
            <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
              <TextInput id="duration_minutes" name="duration_minutes" labelText="Duration (mins)" type="number" min="0" />
            </FormGroup>
          </Column>
          <Column sm={4} md={8} lg={16}>
            <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
              <TextArea id="outcomes" name="outcomes" labelText="Outcomes" rows={3} placeholder="What was achieved during the drill?" />
            </FormGroup>
          </Column>
          <Column sm={4} md={8} lg={16}>
            <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
              <TextArea id="findings" name="findings" labelText="Findings / Improvements" rows={3} placeholder="Any issues identified or improvements needed?" />
            </FormGroup>
          </Column>
          <Column sm={4} md={8} lg={16}>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Mark as Completed'}</Button>
          </Column>
        </Grid>
      </form>
    </div>
  )
}
