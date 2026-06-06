'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, TextInput,
  Select, SelectItem, FormGroup, Form, InlineNotification,
} from '@carbon/react'
import { addWarden } from '@/app/actions/emergency'

interface Worker { id: string; first_name: string; last_name: string; email: string }
interface Site { id: string; name: string }

interface Props {
  workers: Worker[]
  sites: Site[]
}

const WARDEN_TYPES = [
  { value: 'chief_warden', label: 'Chief Warden' },
  { value: 'area_warden', label: 'Area Warden' },
  { value: 'first_aid_officer', label: 'First Aid Officer' },
  { value: 'deputy_warden', label: 'Deputy Warden' },
]

export function WardenForm({ workers, sites }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await addWarden(new FormData(e.currentTarget))
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Warden Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="worker_id" name="worker_id" labelText="Worker *" required>
                        <SelectItem value="" text="Select worker…" />
                        {workers.map((w) => (
                          <SelectItem key={w.id} value={w.id} text={`${w.first_name} ${w.last_name} (${w.email})`} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="warden_type" name="warden_type" labelText="Warden Role *" required>
                        <SelectItem value="" text="Select role…" />
                        {WARDEN_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} text={t.label} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="site_id" name="site_id" labelText="Site">
                        <SelectItem value="" text="All sites" />
                        {sites.map((s) => (
                          <SelectItem key={s.id} value={s.id} text={s.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="area" name="area" labelText="Responsible Area" placeholder="e.g. Level 2 North Wing" />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Add Warden'}</Button>
              <Button kind="ghost" type="button" onClick={() => window.history.back()}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
