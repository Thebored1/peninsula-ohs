'use client'

import { useState } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  Select,
  SelectItem,
  TextInput,
  TextArea,
  Form,
  FormGroup,
  InlineNotification,
} from '@carbon/react'

interface Worker {
  id: string
  first_name: string
  last_name: string
}

interface Site {
  id: string
  name: string
}

interface Props {
  workers: Worker[]
  sites: Site[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function FatigueForm({ workers, sites, action }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await action(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
            lowContrast
          />
        </div>
      )}
      <Form onSubmit={handleSubmit}>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            {/* Worker & Shift Details */}
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Shift Details
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="worker_id"
                        name="worker_id"
                        labelText="Worker *"
                        required
                      >
                        <SelectItem value="" text="Select worker…" />
                        {workers.map((w) => (
                          <SelectItem
                            key={w.id}
                            value={w.id}
                            text={`${w.first_name} ${w.last_name}`}
                          />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>

                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="shift_date"
                        name="shift_date"
                        labelText="Shift Date *"
                        type="date"
                        required
                        defaultValue={new Date().toISOString().split('T')[0]}
                      />
                    </FormGroup>
                  </Column>

                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="shift_start"
                        name="shift_start"
                        labelText="Shift Start *"
                        type="datetime-local"
                        required
                      />
                    </FormGroup>
                  </Column>

                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="shift_end"
                        name="shift_end"
                        labelText="Shift End"
                        type="datetime-local"
                      />
                    </FormGroup>
                  </Column>

                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="shift_type"
                        name="shift_type"
                        labelText="Shift Type *"
                        defaultValue="standard"
                        required
                      >
                        <SelectItem value="standard" text="Standard" />
                        <SelectItem value="overtime" text="Overtime" />
                        <SelectItem value="on_call" text="On Call" />
                        <SelectItem value="night" text="Night" />
                      </Select>
                    </FormGroup>
                  </Column>

                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="site_id"
                        name="site_id"
                        labelText="Site"
                      >
                        <SelectItem value="" text="Select site (optional)…" />
                        {sites.map((s) => (
                          <SelectItem key={s.id} value={s.id} text={s.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>

            {/* Notes */}
            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Notes
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="notes"
                        name="notes"
                        labelText="Notes"
                        rows={4}
                        placeholder="Any relevant notes about this shift…"
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Log Shift'}
              </Button>
              <Button kind="ghost" href="/fatigue">
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
