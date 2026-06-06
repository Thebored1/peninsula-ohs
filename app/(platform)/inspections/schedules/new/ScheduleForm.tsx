'use client'

import { useState } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  Select,
  SelectItem,
  TextInput,
  InlineNotification,
  FormGroup,
} from '@carbon/react'

interface Template {
  id: string
  name: string
  inspection_types: { name: string } | { name: string }[] | null
}

interface User {
  id: string
  first_name: string
  last_name: string
}

interface Props {
  templates: Template[]
  users: User[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

const RECURRENCE_TYPES = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export function ScheduleForm({ templates, users, action }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
          No published templates found. Create and publish a template before setting up a schedule.
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
            <FormGroup legendText="Schedule Setup">
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="name"
                      name="name"
                      labelText="Schedule Name"
                      placeholder="e.g. Weekly Site Walkthrough"
                      required
                    />
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Select
                      id="template_id"
                      name="template_id"
                      labelText="Template"
                      required
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
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Select
                      id="recurrence_type"
                      name="recurrence_type"
                      labelText="Recurrence"
                      defaultValue="once"
                    >
                      {RECURRENCE_TYPES.map(r => (
                        <SelectItem key={r.value} value={r.value} text={r.label} />
                      ))}
                    </Select>
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="next_due_at"
                      name="next_due_at"
                      labelText="Next Due Date"
                      type="datetime-local"
                    />
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Select
                      id="assigned_to"
                      name="assigned_to"
                      labelText="Assigned To (optional)"
                    >
                      <SelectItem value="" text="Unassigned" />
                      {users.map(u => (
                        <SelectItem
                          key={u.id}
                          value={u.id}
                          text={`${u.first_name} ${u.last_name}`}
                        />
                      ))}
                    </Select>
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="advance_notice_days"
                      name="advance_notice_days"
                      labelText="Advance Notice (days)"
                      type="number"
                      min="0"
                      defaultValue="1"
                      helperText="Create inspection this many days before due date"
                    />
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <TextInput
                    id="overdue_after_hours"
                    name="overdue_after_hours"
                    labelText="Mark Overdue After (hours)"
                    type="number"
                    min="1"
                    defaultValue="24"
                    helperText="Flag as overdue if not completed within this time"
                  />
                </Column>
              </Grid>
            </FormGroup>
          </Tile>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" kind="primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Schedule'}
            </Button>
            <Button kind="secondary" href="/inspections/schedules">
              Cancel
            </Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
