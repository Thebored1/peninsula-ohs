'use client'

import { useState, useEffect } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  Select,
  SelectItem,
  TextArea,
  DatePicker,
  DatePickerInput,
  Form,
  FormGroup,
  InlineNotification,
} from '@carbon/react'
import { createPpe } from '@/app/actions/ppe'

interface Worker {
  id: string
  name: string
  job_title: string | null
}

interface PpeItem {
  id: string
  label: string
  quantity_available: number
}

interface PpeFormProps {
  workers: Worker[]
  ppeItems: PpeItem[]
}

export function PpeForm({ workers, ppeItems }: PpeFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issuedDate, setIssuedDate] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [defaultIssuedDate, setDefaultIssuedDate] = useState('')

  useEffect(() => {
    const fmt = new Date().toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    setIssuedDate(fmt)
    setDefaultIssuedDate(fmt)
  }, [])

  function parseAuDate(val: string): string {
    const parts = val.split('/')
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return val
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData(event.currentTarget)
      if (issuedDate) {
        formData.set('issued_date', parseAuDate(issuedDate))
      }
      if (expectedReturnDate) {
        formData.set('expected_return_date', parseAuDate(expectedReturnDate))
      } else {
        formData.delete('expected_return_date')
      }

      const result = await createPpe(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
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
          {/* Worker & Item */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Issuance Details
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
                            text={w.job_title ? `${w.name} — ${w.job_title}` : w.name}
                          />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="ppe_item_id"
                        name="ppe_item_id"
                        labelText="PPE Item *"
                        required
                      >
                        <SelectItem value="" text="Select PPE item…" />
                        {ppeItems.map((item) => (
                          <SelectItem
                            key={item.id}
                            value={item.id}
                            text={`${item.label} (${item.quantity_available} available)`}
                          />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>

                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <DatePicker
                        datePickerType="single"
                        dateFormat="d/m/Y"
                        value={defaultIssuedDate}
                        onChange={(dates: Date[]) => {
                          if (dates[0]) {
                            setIssuedDate(
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
                          id="issued_date_input"
                          labelText="Issued Date *"
                          placeholder="DD/MM/YYYY"
                        />
                      </DatePicker>
                    </FormGroup>
                  </Column>

                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <DatePicker
                        datePickerType="single"
                        dateFormat="d/m/Y"
                        onChange={(dates: Date[]) => {
                          if (dates[0]) {
                            setExpectedReturnDate(
                              dates[0].toLocaleDateString('en-AU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            )
                          } else {
                            setExpectedReturnDate('')
                          }
                        }}
                      >
                        <DatePickerInput
                          id="expected_return_date_input"
                          labelText="Expected Return Date"
                          placeholder="DD/MM/YYYY (optional)"
                        />
                      </DatePicker>
                    </FormGroup>
                  </Column>

                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="condition_on_issue"
                        name="condition_on_issue"
                        labelText="Condition on Issue"
                        defaultValue="good"
                      >
                        <SelectItem value="new" text="New" />
                        <SelectItem value="good" text="Good" />
                        <SelectItem value="fair" text="Fair" />
                        <SelectItem value="poor" text="Poor" />
                      </Select>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Notes */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Additional Notes
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <FormGroup legendText="">
                  <TextArea
                    id="notes"
                    name="notes"
                    labelText="Notes"
                    placeholder="Any relevant notes about this issuance…"
                    rows={3}
                  />
                </FormGroup>
              </div>
            </Tile>
          </Column>

          {/* Actions */}
          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Issue PPE'}
              </Button>
              <Button kind="ghost" href="/ppe">
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
