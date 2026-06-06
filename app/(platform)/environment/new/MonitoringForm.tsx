'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  Form, FormGroup, InlineNotification,
} from '@carbon/react'

interface ParamType { id: string; name: string; monitoring_category: string }
interface Unit { id: string; name: string; symbol: string }
interface Station { id: string; name: string; station_code: string | null }

interface Props {
  parameterTypes: ParamType[]
  units: Unit[]
  stations: Station[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function MonitoringForm({ parameterTypes, units, stations, action }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await action(new FormData(e.currentTarget))
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Reading Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="parameter_type_id" name="parameter_type_id" labelText="Parameter Type *" required>
                        <SelectItem value="" text="Select parameter…" />
                        {parameterTypes.map((p) => (
                          <SelectItem key={p.id} value={p.id} text={`${p.name} (${p.monitoring_category.replace(/_/g, ' ')})`} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="station_id" name="station_id" labelText="Monitoring Station">
                        <SelectItem value="" text="No station (ad hoc)" />
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id} text={s.station_code ? `${s.name} (${s.station_code})` : s.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="measured_value" name="measured_value" labelText="Measured Value *" type="number" placeholder="0.00" required />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="unit_id" name="unit_id" labelText="Unit">
                        <SelectItem value="" text="Select unit…" />
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id} text={`${u.name} (${u.symbol})`} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="measured_at" name="measured_at" labelText="Date & Time *" type="datetime-local" required />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="measurement_method" name="measurement_method" labelText="Measurement Method">
                        <SelectItem value="" text="Not specified" />
                        <SelectItem value="manual" text="Manual" />
                        <SelectItem value="automated" text="Automated" />
                        <SelectItem value="laboratory" text="Laboratory" />
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="weather_conditions" name="weather_conditions" labelText="Weather Conditions" placeholder="e.g. Clear, 22°C, NW wind" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="">
                      <TextArea id="notes" name="notes" labelText="Notes" rows={3} placeholder="Any additional notes…" />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Reading'}</Button>
              <Button kind="ghost" href="/environment">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
