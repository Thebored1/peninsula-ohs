'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea,
  Select, SelectItem, FormGroup, Form, Toggle, InlineNotification,
} from '@carbon/react'
import { addMusterPoint } from '@/app/actions/emergency'

interface Site { id: string; name: string }
interface Props { sites: Site[] }

export function MusterPointForm({ sites }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPrimary, setIsPrimary] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData(e.currentTarget)
      fd.set('is_primary', String(isPrimary))
      const result = await addMusterPoint(fd)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch {
      setError('An unexpected error occurred.')
      setLoading(false)
    }
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Muster Point Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="name" name="name" labelText="Name *" placeholder="e.g. Car Park A Assembly Point" required />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="site_id" name="site_id" labelText="Site *" required>
                        <SelectItem value="" text="Select site…" />
                        {sites.map((s) => (
                          <SelectItem key={s.id} value={s.id} text={s.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="location_description"
                        name="location_description"
                        labelText="Location Description"
                        placeholder="Describe how to get to this muster point…"
                        rows={3}
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="capacity" name="capacity" labelText="Capacity (persons)" type="number" min="0" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem', letterSpacing: '0.32px' }}>
                        Primary muster point?
                      </p>
                      <Toggle
                        id="is_primary"
                        labelA="No"
                        labelB="Yes"
                        toggled={isPrimary}
                        onToggle={(checked: boolean) => setIsPrimary(checked)}
                        hideLabel
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Add Muster Point'}</Button>
              <Button kind="ghost" type="button" onClick={() => window.history.back()}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
