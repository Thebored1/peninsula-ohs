'use client'

import { useState } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  Select,
  SelectItem,
  TextArea,
  TextInput,
  DatePicker,
  DatePickerInput,
  Form,
  FormGroup,
  InlineNotification,
} from '@carbon/react'
import { createSpeakUp } from '@/app/actions/speak-up'

interface Category {
  id: string
  name: string
  description?: string | null
}

interface Site {
  id: string
  name: string
}

interface Props {
  categories: Category[]
  sites: Site[]
}

export function SpeakUpForm({ categories, sites }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [incidentDate, setIncidentDate] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData(event.currentTarget)

      // Convert date from DD/MM/YYYY to YYYY-MM-DD if set
      if (incidentDate) {
        const parts = incidentDate.split('/')
        if (parts.length === 3) {
          formData.set('date_of_incident', `${parts[2]}-${parts[1]}-${parts[0]}`)
        } else {
          formData.set('date_of_incident', incidentDate)
        }
      }

      const result = await createSpeakUp(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
      // On success the server action redirects to /speak-up/submitted
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Anonymity notice */}
      <div style={{ marginBottom: '1.5rem' }}>
        <InlineNotification
          kind="info"
          title="Anonymous submission"
          subtitle="This report is submitted anonymously. No personally identifiable information is collected or stored. You do not need to be logged in to submit a report."
          lowContrast
          hideCloseButton
        />
      </div>

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
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="category_id"
                        name="category_id"
                        labelText="Category"
                      >
                        <SelectItem value="" text="Select a category…" />
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} text={cat.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="severity"
                        name="severity"
                        labelText="Severity"
                        defaultValue="medium"
                      >
                        <SelectItem value="low" text="Low" />
                        <SelectItem value="medium" text="Medium" />
                        <SelectItem value="high" text="High" />
                        <SelectItem value="critical" text="Critical" />
                      </Select>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Report Details */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Report Details
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="description"
                        name="description"
                        labelText="Description *"
                        placeholder="Describe the concern or incident in as much detail as possible…"
                        rows={5}
                        required
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <DatePicker
                        datePickerType="single"
                        dateFormat="d/m/Y"
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
                          id="date_of_incident"
                          labelText="Date of Incident (optional)"
                          placeholder="DD/MM/YYYY"
                        />
                      </DatePicker>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="location"
                        name="location"
                        labelText="Location (optional)"
                        placeholder="e.g. Building A, Warehouse, Car park"
                      />
                    </FormGroup>
                  </Column>
                  {sites.length > 0 && (
                    <Column sm={4} md={4} lg={8}>
                      <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                        <Select
                          id="site_id"
                          name="site_id"
                          labelText="Site (optional)"
                        >
                          <SelectItem value="" text="Select a site…" />
                          {sites.map((site) => (
                            <SelectItem key={site.id} value={site.id} text={site.name} />
                          ))}
                        </Select>
                      </FormGroup>
                    </Column>
                  )}
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Submit */}
          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Report'}
              </Button>
              <Button kind="ghost" href="/speak-up">
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
