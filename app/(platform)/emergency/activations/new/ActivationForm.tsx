'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, TextArea,
  Select, SelectItem, FormGroup, Form, InlineNotification,
} from '@carbon/react'
import { activateEmergency } from '@/app/actions/emergency'

interface Site { id: string; name: string }
interface Plan { id: string; plan_number: string | null; title: string }
interface EmergencyType { id: string; name: string; colour_code: string }

interface Props {
  sites: Site[]
  plans: Plan[]
  emergencyTypes: EmergencyType[]
}

export function ActivationForm({ sites, plans, emergencyTypes }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await activateEmergency(new FormData(e.currentTarget))
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Activation Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="emergency_type" name="emergency_type" labelText="Emergency Type *" required>
                        <SelectItem value="" text="Select type…" />
                        {emergencyTypes.map((t) => (
                          <SelectItem key={t.id} value={t.name} text={t.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="site_id" name="site_id" labelText="Site">
                        <SelectItem value="" text="Select site…" />
                        {sites.map((s) => (
                          <SelectItem key={s.id} value={s.id} text={s.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="plan_id" name="plan_id" labelText="Response Plan (optional)">
                        <SelectItem value="" text="None" />
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id} text={`${p.plan_number ? p.plan_number + ' — ' : ''}${p.title}`} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="description"
                        name="description"
                        labelText="Description"
                        placeholder="Describe the emergency situation…"
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
              <Button type="submit" kind="danger" disabled={loading}>
                {loading ? 'Activating…' : 'Activate Emergency'}
              </Button>
              <Button kind="ghost" type="button" onClick={() => window.history.back()}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
