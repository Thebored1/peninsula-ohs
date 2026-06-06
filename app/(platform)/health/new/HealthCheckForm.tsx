'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  Form, FormGroup, Toggle, InlineNotification,
} from '@carbon/react'

interface Worker { id: string; first_name: string; last_name: string }
interface SurveillanceType { id: string; name: string }

interface Props {
  workers: Worker[]
  surveillanceTypes: SurveillanceType[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function HealthCheckForm({ workers, surveillanceTypes, action }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restrictionsIssued, setRestrictionsIssued] = useState(false)
  const [isBaseline, setIsBaseline] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('restrictions_issued', String(restrictionsIssued))
    fd.set('is_baseline', String(isBaseline))
    const result = await action(fd)
    if (result?.error) { setError(result.error); setLoading(false) }
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Check Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="user_id" name="user_id" labelText="Worker *" required>
                        <SelectItem value="" text="Select worker…" />
                        {workers.map((w) => (
                          <SelectItem key={w.id} value={w.id} text={`${w.first_name} ${w.last_name}`} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="surveillance_type_id" name="surveillance_type_id" labelText="Surveillance Type *" required>
                        <SelectItem value="" text="Select type…" />
                        {surveillanceTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id} text={t.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="result" name="result" labelText="Result *" required>
                        <SelectItem value="" text="Select result…" />
                        <SelectItem value="fit" text="Fit" />
                        <SelectItem value="fit_with_restrictions" text="Fit with restrictions" />
                        <SelectItem value="temporarily_unfit" text="Temporarily unfit" />
                        <SelectItem value="refer_specialist" text="Refer to specialist" />
                        <SelectItem value="pending" text="Pending" />
                        <SelectItem value="not_completed" text="Not completed" />
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="check_date" name="check_date" labelText="Check Date *" type="date" required />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="next_check_due" name="next_check_due" labelText="Next Check Due" type="date" />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Provider</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="provider_name" name="provider_name" labelText="Provider Name" placeholder="Clinic or provider name" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="provider_reference" name="provider_reference" labelText="Provider Reference" placeholder="Provider's report number" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea id="result_notes" name="result_notes" labelText="Notes (non-clinical)" rows={3} placeholder="Brief non-clinical notes only…" />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Flags</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem', letterSpacing: '0.32px' }}>Restrictions issued?</p>
                      <Toggle id="restrictions_issued_toggle" labelA="No" labelB="Yes" toggled={restrictionsIssued} onToggle={(v: boolean) => setRestrictionsIssued(v)} hideLabel />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem', letterSpacing: '0.32px' }}>Baseline check?</p>
                      <Toggle id="is_baseline_toggle" labelA="No" labelB="Yes" toggled={isBaseline} onToggle={(v: boolean) => setIsBaseline(v)} hideLabel />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Record'}</Button>
              <Button kind="ghost" href="/health">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
