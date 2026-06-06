'use client'

import { useState, useEffect } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  InlineNotification,
} from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'

interface Site {
  id: string
  name: string
}

interface TemplatePoint {
  id: string
  point_number: number
  point_text: string
  point_type: string
}

export interface DeliverTemplate {
  id: string
  title: string
  estimated_duration_minutes: number
  toolbox_talk_categories: { name: string; colour_code: string } | null
  toolbox_talk_template_points: TemplatePoint[]
}

interface Worker {
  id: string
  first_name: string
  last_name: string
}

interface Attendee {
  uid: string
  name: string
  worker_id: string
}

interface Props {
  sites: Site[]
  templates: DeliverTemplate[]
  workers: Worker[]
  action: (formData: FormData) => Promise<{ error?: string }>
  initialTemplateId?: string
}

const pointTypeLabel: Record<string, string> = {
  key_point: 'Key Point',
  discussion_question: 'Discussion',
  action_item: 'Action',
}

export default function DeliverTalkForm({ sites, templates, workers, action, initialTemplateId }: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId ?? '')
  const [talkTitle, setTalkTitle] = useState('')
  const [attendees, setAttendees] = useState<Attendee[]>([
    { uid: crypto.randomUUID(), name: '', worker_id: '' },
  ])

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) ?? null

  // Auto-fill title when template changes
  useEffect(() => {
    if (selectedTemplate) {
      setTalkTitle(selectedTemplate.title)
    }
  }, [selectedTemplateId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId)
    if (!templateId) {
      setTalkTitle('')
    }
  }

  function addAttendee() {
    setAttendees(prev => [...prev, { uid: crypto.randomUUID(), name: '', worker_id: '' }])
  }

  function removeAttendee(uid: string) {
    if (attendees.length === 1) return
    setAttendees(prev => prev.filter(a => a.uid !== uid))
  }

  function updateAttendeeName(uid: string, name: string) {
    setAttendees(prev => prev.map(a => a.uid === uid ? { ...a, name } : a))
  }

  function updateAttendeeWorker(uid: string, worker_id: string) {
    const worker = workers.find(w => w.id === worker_id)
    setAttendees(prev => prev.map(a =>
      a.uid === uid
        ? { ...a, worker_id, name: worker ? `${worker.first_name} ${worker.last_name}` : a.name }
        : a
    ))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)

    // Ensure current title value is in FormData (controlled input)
    fd.set('title', talkTitle.trim())

    const validAttendees = attendees.filter(a => a.name.trim())
    fd.set('attendees_json', JSON.stringify(validAttendees.map(a => ({
      name: a.name.trim(),
      worker_id: a.worker_id || undefined,
    }))))

    const result = await action(fd)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
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

          {/* Talk Details */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Talk Details
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <Select
                id="template_id"
                name="template_id"
                labelText="Template (optional)"
                onChange={e => handleTemplateChange(e.target.value)}
                value={selectedTemplateId}
              >
                <SelectItem value="" text="— Ad-hoc (no template) —" />
                {templates.map(t => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    text={t.title + (t.toolbox_talk_categories ? ` — ${t.toolbox_talk_categories.name}` : '')}
                  />
                ))}
              </Select>
            </div>

            {selectedTemplate && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.875rem 1rem',
                backgroundColor: '#f4f4f4',
                borderLeft: `3px solid ${selectedTemplate.toolbox_talk_categories?.colour_code ?? '#0f62fe'}`,
              }}>
                <p style={{ fontSize: '0.8125rem', color: '#525252', marginBottom: '0.25rem' }}>
                  {selectedTemplate.toolbox_talk_categories?.name ?? 'Uncategorised'} — {selectedTemplate.estimated_duration_minutes} min
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                  {selectedTemplate.toolbox_talk_template_points.length} discussion point{selectedTemplate.toolbox_talk_template_points.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <TextInput
                id="title"
                name="title"
                labelText="Title"
                placeholder="e.g. Working at Heights Safety Briefing"
                value={talkTitle}
                onChange={e => setTalkTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <TextInput
                id="delivered_at"
                name="delivered_at"
                labelText="Delivered At"
                type="datetime-local"
                defaultValue={new Date().toISOString().slice(0, 16)}
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

            <div style={{ marginBottom: '1rem' }}>
              <TextInput
                id="location"
                name="location"
                labelText="Location / Area (optional)"
                placeholder="e.g. Site office, Gate 2"
              />
            </div>

            <TextArea
              id="notes"
              name="notes"
              labelText="Notes (optional)"
              placeholder="Any additional notes about this talk, key outcomes, follow-ups needed…"
              rows={3}
            />
          </Tile>

          {/* Discussion Points preview from template */}
          {selectedTemplate && selectedTemplate.toolbox_talk_template_points.length > 0 && (
            <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
                Discussion Points
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {[...selectedTemplate.toolbox_talk_template_points]
                  .sort((a, b) => a.point_number - b.point_number)
                  .map(pt => {
                    const typeColours: Record<string, string> = {
                      key_point: '#0f62fe',
                      discussion_question: '#6929c4',
                      action_item: '#da1e28',
                    }
                    const colour = typeColours[pt.point_type] ?? '#525252'
                    return (
                      <div key={pt.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{
                          minWidth: '1.25rem', height: '1.25rem', borderRadius: '50%',
                          backgroundColor: colour, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0, marginTop: '0.125rem',
                        }}>
                          {pt.point_number}
                        </div>
                        <div>
                          <span style={{
                            fontSize: '0.6875rem', fontWeight: 700, color: '#6f6f6f',
                            textTransform: 'uppercase', letterSpacing: '0.32px',
                          }}>
                            {pointTypeLabel[pt.point_type] ?? pt.point_type}
                          </span>
                          <p style={{ fontSize: '0.875rem', color: '#161616', marginTop: '0.125rem' }}>
                            {pt.point_text}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </Tile>
          )}

          {/* Attendees */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>
                  Attendees
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                  Add all workers, visitors, or contractors who attended this talk.
                </p>
              </div>
              <Button kind="ghost" size="sm" renderIcon={Add} type="button" onClick={addAttendee}>
                Add Attendee
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {attendees.map((a, idx) => (
                <div
                  key={a.uid}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: workers.length > 0 ? '1fr 1fr auto' : '1fr auto',
                    gap: '0.75rem',
                    alignItems: 'flex-end',
                  }}
                >
                  <TextInput
                    id={`attendee-name-${a.uid}`}
                    labelText={idx === 0 ? 'Name' : ''}
                    placeholder="Full name (worker, visitor, or contractor)"
                    value={a.name}
                    onChange={e => updateAttendeeName(a.uid, e.target.value)}
                    hideLabel={idx > 0}
                  />
                  {workers.length > 0 && (
                    <Select
                      id={`attendee-worker-${a.uid}`}
                      labelText={idx === 0 ? 'Worker Profile (optional)' : ''}
                      hideLabel={idx > 0}
                      value={a.worker_id}
                      onChange={e => updateAttendeeWorker(a.uid, e.target.value)}
                    >
                      <SelectItem value="" text="— Manual entry —" />
                      {workers.map(w => (
                        <SelectItem key={w.id} value={w.id} text={`${w.first_name} ${w.last_name}`} />
                      ))}
                    </Select>
                  )}
                  {attendees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAttendee(a.uid)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#da1e28', padding: '0.5rem', display: 'flex',
                        alignItems: 'center', flexShrink: 0,
                      }}
                      aria-label="Remove attendee"
                    >
                      <TrashCan size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Tile>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" kind="primary" disabled={loading}>
              {loading ? 'Saving…' : 'Record Talk'}
            </Button>
            <Button
              kind="secondary"
              type="button"
              disabled={loading}
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
