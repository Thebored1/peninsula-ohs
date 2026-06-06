'use client'

import { useState } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  FormGroup,
  Form,
  InlineNotification,
} from '@carbon/react'
import { createEmergencyPlan } from '@/app/actions/emergency'

interface EmergencyType {
  id: string
  name: string
  colour_code: string
}

interface Site {
  id: string
  name: string
}

interface Props {
  emergencyTypes: EmergencyType[]
  sites: Site[]
}

export function EmergencyPlanForm({ emergencyTypes, sites }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await createEmergencyPlan(new FormData(e.currentTarget))
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Plan Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="title"
                        name="title"
                        labelText="Plan Title *"
                        placeholder="e.g. Fire Emergency Response Plan"
                        required
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="emergency_type_id" name="emergency_type_id" labelText="Emergency Type">
                        <SelectItem value="" text="Select type…" />
                        {emergencyTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id} text={t.name} />
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
                      <TextInput
                        id="version_number"
                        name="version_number"
                        labelText="Version Number"
                        defaultValue="1.0"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="next_review_date"
                        name="next_review_date"
                        labelText="Next Review Date"
                        type="date"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="description"
                        name="description"
                        labelText="Description"
                        placeholder="Describe the scope and purpose of this emergency response plan…"
                        rows={4}
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save Plan'}
              </Button>
              <Button kind="ghost" type="button" onClick={() => window.history.back()}>
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
