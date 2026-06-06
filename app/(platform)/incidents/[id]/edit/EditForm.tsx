'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  DatePicker, DatePickerInput, Form, FormGroup, Toggle, InlineNotification,
} from '@carbon/react'
import { updateIncident } from '@/app/actions/incidents'

interface IncidentType { id: string; name: string; code: string }
interface SeverityLevel { id: string; name: string; level_number: number; colour_code: string }

interface InitialData {
  incident_type_id: string | null
  severity_level_id: string | null
  title: string
  description: string
  incident_date: string | null
  incident_time: string | null
  exact_location: string | null
  immediate_actions_taken: string | null
  was_injury_involved: boolean
  regulatory_reportable: boolean
}

interface Props {
  id: string
  initialData: InitialData
  incidentTypes: IncidentType[]
  severityLevels: SeverityLevel[]
}

function toDisplayDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function EditIncidentForm({ id, initialData, incidentTypes, severityLevels }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [wasInjury, setWasInjury] = useState(initialData.was_injury_involved)
  const [regulatory, setRegulatory] = useState(initialData.regulatory_reportable)
  const [incidentDate, setIncidentDate] = useState(toDisplayDate(initialData.incident_date))

  useEffect(() => {
    setIncidentDate(toDisplayDate(initialData.incident_date))
  }, [initialData.incident_date])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('was_injury_involved', String(wasInjury))
    formData.set('regulatory_reportable', String(regulatory))
    if (incidentDate) {
      const parts = incidentDate.split('/')
      if (parts.length === 3) {
        formData.set('incident_date', `${parts[2]}-${parts[1]}-${parts[0]}`)
      } else {
        formData.set('incident_date', incidentDate)
      }
    }
    startTransition(async () => {
      const result = await updateIncident(id, formData)
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Classification</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="">
                      <Select id="incident_type_id" name="incident_type_id" labelText="Incident Type *" defaultValue={initialData.incident_type_id ?? ''} required>
                        <SelectItem value="" text="Select incident type…" />
                        {incidentTypes.map((t) => <SelectItem key={t.id} value={t.id} text={t.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="">
                      <Select id="severity_level_id" name="severity_level_id" labelText="Severity Level" defaultValue={initialData.severity_level_id ?? ''}>
                        <SelectItem value="" text="Select severity…" />
                        {severityLevels.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Incident Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="title" name="title" labelText="Title *" defaultValue={initialData.title} required />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea id="description" name="description" labelText="Description *" defaultValue={initialData.description} rows={4} required />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <DatePicker
                        datePickerType="single"
                        dateFormat="d/m/Y"
                        value={incidentDate}
                        onChange={(dates: Date[]) => {
                          if (dates[0]) setIncidentDate(dates[0].toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }))
                        }}
                      >
                        <DatePickerInput id="incident_date" labelText="Incident Date *" placeholder="DD/MM/YYYY" />
                      </DatePicker>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="incident_time" name="incident_time" labelText="Incident Time" type="time" defaultValue={initialData.incident_time ?? ''} />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="exact_location" name="exact_location" labelText="Exact Location" defaultValue={initialData.exact_location ?? ''} />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Injury &amp; Regulatory</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem' }}>Was an injury involved?</p>
                      <Toggle id="was_injury_involved" labelA="No" labelB="Yes" toggled={wasInjury} onToggle={(c: boolean) => setWasInjury(c)} hideLabel />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem' }}>Regulatory reportable?</p>
                      <Toggle id="regulatory_reportable" labelA="No" labelB="Yes" toggled={regulatory} onToggle={(c: boolean) => setRegulatory(c)} hideLabel />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Immediate Actions</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <TextArea id="immediate_actions_taken" name="immediate_actions_taken" labelText="Immediate Actions Taken" defaultValue={initialData.immediate_actions_taken ?? ''} rows={3} />
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Changes'}</Button>
              <Button kind="ghost" href={`/incidents/${id}`}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
