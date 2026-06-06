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
  InlineNotification,
  FormGroup,
} from '@carbon/react'

interface Template {
  id: string
  name: string
  description: string | null
  estimated_duration_minutes: number | null
  passing_score_threshold: number
  inspection_types: { name: string } | { name: string }[] | null
}

interface Props {
  templates: Template[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function InspectionForm({ templates, action }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Template | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await action(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  function typeName(t: Template): string | null {
    const raw = t.inspection_types
    const obj = Array.isArray(raw) ? raw[0] : raw
    return (obj as { name: string } | null)?.name ?? null
  }

  if (templates.length === 0) {
    return (
      <Tile style={{ padding: '2rem' }}>
        <p style={{ fontSize: '0.875rem', color: '#6f6f6f', marginBottom: '1rem' }}>
          No published templates found. You need at least one published template before starting an
          inspection.
        </p>
        <Button kind="primary" href="/inspections/templates/new">
          Create Template
        </Button>
      </Tile>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Grid>
        <Column sm={4} md={8} lg={12}>
          {error && (
            <div style={{ marginBottom: '1rem' }}>
              <InlineNotification kind="error" title="Error" subtitle={error} lowContrast />
            </div>
          )}

          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <FormGroup legendText="Inspection Setup">
              <div style={{ marginBottom: '1.5rem' }}>
                <Select
                  id="template_id"
                  name="template_id"
                  labelText="Template"
                  required
                  onChange={e =>
                    setSelected(templates.find(t => t.id === e.target.value) ?? null)
                  }
                >
                  <SelectItem value="" text="Select a template…" />
                  {templates.map(t => {
                    const type = typeName(t)
                    return (
                      <SelectItem
                        key={t.id}
                        value={t.id}
                        text={type ? `${t.name} (${type})` : t.name}
                      />
                    )
                  })}
                </Select>
              </div>

              {selected && (
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: '#f4f4f4',
                    borderLeft: '3px solid #0f62fe',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {selected.description && (
                    <p style={{ color: '#161616', marginBottom: '0.5rem' }}>
                      {selected.description}
                    </p>
                  )}
                  <p style={{ color: '#525252' }}>
                    Passing score: {selected.passing_score_threshold}%
                    {selected.estimated_duration_minutes
                      ? ` · Est. ${selected.estimated_duration_minutes} min`
                      : ''}
                  </p>
                </div>
              )}

              <TextArea
                id="notes"
                name="notes"
                labelText="Notes (optional)"
                placeholder="Any context about this inspection…"
                rows={3}
              />
            </FormGroup>
          </Tile>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" kind="primary" disabled={loading}>
              {loading ? 'Starting…' : 'Start Inspection'}
            </Button>
            <Button kind="secondary" href="/inspections">
              Cancel
            </Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
