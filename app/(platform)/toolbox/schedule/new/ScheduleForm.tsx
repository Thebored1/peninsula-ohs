'use client'

import { useState } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  TextInput,
  Select,
  SelectItem,
  InlineNotification,
} from '@carbon/react'

export interface ScheduleTemplate {
  id: string
  title: string
  toolbox_talk_categories: { name: string } | null
}

// Alias for internal use
type Template = ScheduleTemplate

interface Site {
  id: string
  name: string
}

interface Worker {
  id: string
  first_name: string
  last_name: string
}

interface Props {
  templates: ScheduleTemplate[]
  sites: Site[]
  workers: Worker[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export default function ScheduleForm({ templates, sites, workers, action }: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) ?? null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await action(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Grid>
        <Column sm={4} md={8} lg={8}>
          {error && (
            <div style={{ marginBottom: '1rem' }}>
              <InlineNotification kind="error" title="Error" subtitle={error} lowContrast />
            </div>
          )}

          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Schedule Details
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <Select
                id="template_id"
                name="template_id"
                labelText="Template"
                required
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
              >
                <SelectItem value="" text="— Select a template —" />
                {templates.map(t => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    text={t.title + (t.toolbox_talk_categories ? ` — ${t.toolbox_talk_categories.name}` : '')}
                  />
                ))}
              </Select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <TextInput
                id="title"
                name="title"
                labelText="Talk Title"
                placeholder="Title for this scheduled talk"
                defaultValue={selectedTemplate?.title ?? ''}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <TextInput
                id="scheduled_date"
                name="scheduled_date"
                labelText="Scheduled Date"
                type="date"
                required
              />
              {sites.length > 0 ? (
                <Select id="site_id" name="site_id" labelText="Site (optional)">
                  <SelectItem value="" text="— No specific site —" />
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id} text={s.name} />
                  ))}
                </Select>
              ) : (
                <input type="hidden" name="site_id" value="" />
              )}
            </div>

            {workers.length > 0 && (
              <Select id="assigned_to" name="assigned_to" labelText="Assigned To (optional)">
                <SelectItem value="" text="— Unassigned —" />
                {workers.map(w => (
                  <SelectItem key={w.id} value={w.id} text={`${w.first_name} ${w.last_name}`} />
                ))}
              </Select>
            )}
          </Tile>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" kind="primary" disabled={loading}>
              {loading ? 'Saving…' : 'Schedule Talk'}
            </Button>
            <Button kind="secondary" href="/toolbox/schedule" disabled={loading}>
              Cancel
            </Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
