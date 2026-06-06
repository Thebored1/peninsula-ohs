'use client'

import { useState } from 'react'
import { Button, TextInput, TextArea, Select, SelectItem, Tile, Grid, Column, InlineNotification } from '@carbon/react'
import { createReportDefinition } from '@/app/actions/reports'

const REPORT_TYPES = [
  { value: 'incident', label: 'Incident' },
  { value: 'risk', label: 'Risk' },
  { value: 'action', label: 'Action / CAPA' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'audit', label: 'Audit' },
  { value: 'chemical', label: 'Chemical' },
  { value: 'asset', label: 'Asset' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'custom', label: 'Custom' },
]

export default function ReportBuilderForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await createReportDefinition(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Grid>
        <Column sm={4} md={8} lg={10}>
          {error && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error}
              style={{ marginBottom: '1rem' }}
            />
          )}

          <Tile style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Report Details
            </h2>
            <Grid>
              <Column sm={4} md={8} lg={8}>
                <TextInput
                  id="name"
                  name="name"
                  labelText="Report Name"
                  placeholder="e.g. Monthly Incident Summary"
                  required
                  style={{ marginBottom: '1rem' }}
                />
              </Column>
              <Column sm={4} md={4} lg={4}>
                <Select
                  id="report_type"
                  name="report_type"
                  labelText="Report Type"
                  defaultValue="custom"
                  style={{ marginBottom: '1rem' }}
                >
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} text={t.label} />
                  ))}
                </Select>
              </Column>
              <Column sm={4} md={8} lg={8}>
                <TextArea
                  id="description"
                  name="description"
                  labelText="Description"
                  placeholder="Optional — describe what this report covers"
                  rows={3}
                  style={{ marginBottom: '1rem' }}
                />
              </Column>
            </Grid>
          </Tile>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Report'}
            </Button>
            <Button kind="ghost" type="button" onClick={() => window.history.back()}>
              Cancel
            </Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
