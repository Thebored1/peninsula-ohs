'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  Select,
  SelectItem,
  TextInput,
  TextArea,
  DatePicker,
  DatePickerInput,
  Form,
  FormGroup,
  Toggle,
  InlineNotification,
} from '@carbon/react'
import { createIncident } from '@/app/actions/incidents'

interface IncidentType {
  id: string
  name: string
  code: string
}

interface SeverityLevel {
  id: string
  name: string
  level_number: number
  colour_code: string
}

interface IncidentFormProps {
  incidentTypes: IncidentType[]
  severityLevels: SeverityLevel[]
}

export function IncidentForm({ incidentTypes, severityLevels }: IncidentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wasInjuryInvolved, setWasInjuryInvolved] = useState(false)
  const [regulatoryReportable, setRegulatoryReportable] = useState(false)
  const [incidentDate, setIncidentDate] = useState('')
  const [defaultDate, setDefaultDate] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const fmt = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    setIncidentDate(fmt)
    setDefaultDate(fmt)
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData(event.currentTarget)
      // Inject toggle values (not standard form fields)
      formData.set('was_injury_involved', String(wasInjuryInvolved))
      formData.set('regulatory_reportable', String(regulatoryReportable))
      // Inject the date picked via state
      if (incidentDate) {
        // Convert from DD/MM/YYYY to YYYY-MM-DD
        const parts = incidentDate.split('/')
        if (parts.length === 3) {
          formData.set('incident_date', `${parts[2]}-${parts[1]}-${parts[0]}`)
        } else {
          formData.set('incident_date', incidentDate)
        }
      }

      const result = await createIncident(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
      // On success, createIncident redirects — no need to reset
    } catch {
      setError('An unexpected error occurred. Please try again.')
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

      <Form ref={formRef} onSubmit={handleSubmit}>
        <Grid>
          {/* Classification */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Classification
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="">
                      <Select
                        id="incident_type_id"
                        name="incident_type_id"
                        labelText="Incident Type *"
                        required
                      >
                        <SelectItem value="" text="Select incident type…" />
                        {incidentTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id} text={t.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="">
                      <Select
                        id="severity_level_id"
                        name="severity_level_id"
                        labelText="Severity Level"
                      >
                        <SelectItem value="" text="Select severity…" />
                        {severityLevels.map((s) => (
                          <SelectItem key={s.id} value={s.id} text={s.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Incident Details */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Incident Details
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="title"
                        name="title"
                        labelText="Title *"
                        placeholder="Brief description of the incident"
                        required
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="description"
                        name="description"
                        labelText="Description *"
                        placeholder="Provide a detailed description of what happened…"
                        rows={4}
                        required
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <DatePicker
                        datePickerType="single"
                        dateFormat="d/m/Y"
                        value={defaultDate}
                        onChange={(dates: Date[]) => {
                          if (dates[0]) {
                            setIncidentDate(
                              dates[0].toLocaleDateString('en-AU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            )
                          }
                        }}
                      >
                        <DatePickerInput
                          id="incident_date"
                          labelText="Incident Date *"
                          placeholder="DD/MM/YYYY"
                        />
                      </DatePicker>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="incident_time"
                        name="incident_time"
                        labelText="Incident Time"
                        type="time"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="exact_location"
                        name="exact_location"
                        labelText="Exact Location"
                        placeholder="e.g. Building A, Level 2, Room 204"
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Injury & Regulatory */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Injury &amp; Regulatory
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1.5rem' }}>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#525252',
                          marginBottom: '0.5rem',
                          letterSpacing: '0.32px',
                        }}
                      >
                        Was an injury involved?
                      </p>
                      <Toggle
                        id="was_injury_involved"
                        labelA="No"
                        labelB="Yes"
                        toggled={wasInjuryInvolved}
                        onToggle={(checked: boolean) => setWasInjuryInvolved(checked)}
                        hideLabel
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1.5rem' }}>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#525252',
                          marginBottom: '0.5rem',
                          letterSpacing: '0.32px',
                        }}
                      >
                        Regulatory reportable?
                      </p>
                      <Toggle
                        id="regulatory_reportable"
                        labelA="No"
                        labelB="Yes"
                        toggled={regulatoryReportable}
                        onToggle={(checked: boolean) => setRegulatoryReportable(checked)}
                        hideLabel
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Immediate Actions */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Immediate Actions
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <FormGroup legendText="">
                  <TextArea
                    id="immediate_actions_taken"
                    name="immediate_actions_taken"
                    labelText="Immediate Actions Taken"
                    placeholder="Describe any immediate actions taken to address the incident…"
                    rows={3}
                  />
                </FormGroup>
              </div>
            </Tile>
          </Column>

          {/* Actions */}
          <Column sm={4} md={8} lg={12}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <Button
                kind="primary"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Submitting…' : 'Submit Incident'}
              </Button>
              <Button kind="ghost" href="/incidents">
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
