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
  DatePicker,
  DatePickerInput,
  Toggle,
  Form,
  FormGroup,
  InlineNotification,
} from '@carbon/react'
import { createComplianceCalendar } from '@/app/actions/compliance-calendar'

interface ObligationType {
  id: string
  name: string
  colour_code: string
}

interface Props {
  obligationTypes: ObligationType[]
}

export function ComplianceCalendarForm({ obligationTypes }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCritical, setIsCritical] = useState(false)
  const [nextDueDate, setNextDueDate] = useState<string>('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData(event.currentTarget)
      formData.set('is_critical', String(isCritical))

      // Convert next_due_date from DD/MM/YYYY to YYYY-MM-DD if set
      if (nextDueDate) {
        const parts = nextDueDate.split('/')
        if (parts.length === 3) {
          formData.set('next_due_date', `${parts[2]}-${parts[1]}-${parts[0]}`)
        } else {
          formData.set('next_due_date', nextDueDate)
        }
      } else {
        formData.delete('next_due_date')
      }

      const result = await createComplianceCalendar(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
      // On success, action redirects
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

      <Form onSubmit={handleSubmit}>
        <Grid>
          {/* Obligation Details */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Obligation Details
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
                        placeholder="e.g. Annual WHS Management System Review"
                        required
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="description"
                        name="description"
                        labelText="Description"
                        placeholder="Describe this compliance obligation…"
                        rows={3}
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="obligation_type_id"
                        name="obligation_type_id"
                        labelText="Obligation Type"
                      >
                        <SelectItem value="" text="Select type…" />
                        {obligationTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id} text={t.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="frequency"
                        name="frequency"
                        labelText="Frequency"
                        defaultValue="annual"
                      >
                        <SelectItem value="one_time" text="One Time" />
                        <SelectItem value="monthly" text="Monthly" />
                        <SelectItem value="quarterly" text="Quarterly" />
                        <SelectItem value="semi_annual" text="Semi Annual" />
                        <SelectItem value="annual" text="Annual" />
                      </Select>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Regulatory & Reference */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Regulatory &amp; Reference
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="regulatory_body"
                        name="regulatory_body"
                        labelText="Regulatory Body"
                        placeholder="e.g. SafeWork NSW"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="standard_reference"
                        name="standard_reference"
                        labelText="Standard / Reference"
                        placeholder="e.g. ISO 45001:2018 Clause 9.3"
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Scheduling & Criticality */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Scheduling &amp; Criticality
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <DatePicker
                        datePickerType="single"
                        dateFormat="d/m/Y"
                        onChange={(dates: Date[]) => {
                          if (dates[0]) {
                            setNextDueDate(
                              dates[0].toLocaleDateString('en-AU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            )
                          } else {
                            setNextDueDate('')
                          }
                        }}
                      >
                        <DatePickerInput
                          id="next_due_date"
                          labelText="Next Due Date"
                          placeholder="DD/MM/YYYY"
                        />
                      </DatePicker>
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
                        Critical Obligation
                      </p>
                      <Toggle
                        id="is_critical"
                        labelA="No"
                        labelB="Yes"
                        toggled={isCritical}
                        onToggle={(checked: boolean) => setIsCritical(checked)}
                        hideLabel
                      />
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#6f6f6f',
                          marginTop: '0.5rem',
                        }}
                      >
                        Flag if breach would have high-severity consequences
                      </p>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Actions */}
          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save Obligation'}
              </Button>
              <Button kind="ghost" href="/compliance-calendar">
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
