'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  Form, FormGroup, InlineNotification,
} from '@carbon/react'

interface Requirement { id: string; name: string; regulatory_body: string }

interface Props {
  requirements: Requirement[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function EnvReportForm({ requirements, action }: Props) {
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Submission Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="requirement_id" name="requirement_id" labelText="Reporting Obligation (optional)">
                        <SelectItem value="" text="Ad hoc / not linked" />
                        {requirements.map((r) => (
                          <SelectItem key={r.id} value={r.id} text={`${r.name} — ${r.regulatory_body}`} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="title" name="title" labelText="Report Title *" placeholder="e.g. Monthly Water Quality Report — June 2026" required />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="regulatory_body" name="regulatory_body" labelText="Regulatory Body" placeholder="e.g. EPA, Council" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="submitted_date" name="submitted_date" labelText="Date Submitted *" type="date" required />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="reporting_period_start" name="reporting_period_start" labelText="Period Start" type="date" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="reporting_period_end" name="reporting_period_end" labelText="Period End" type="date" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="submission_method" name="submission_method" labelText="Submission Method" placeholder="e.g. Online portal, email, post" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="reference_number" name="reference_number" labelText="Reference Number" placeholder="Confirmation or reference #" />
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
              <Button kind="primary" type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Submission'}</Button>
              <Button kind="ghost" href="/env-reporting">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
