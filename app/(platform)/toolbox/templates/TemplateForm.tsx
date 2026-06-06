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
  InlineNotification,
  Toggle,
} from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'

interface Category {
  id: string
  name: string
  colour_code: string
}

interface TemplatePoint {
  uid: string
  point_text: string
  point_type: 'key_point' | 'discussion_question' | 'action_item'
}

interface ExistingPoint {
  id: string
  point_number: number
  point_text: string
  point_type: string
}

interface Props {
  categories: Category[]
  action: (formData: FormData) => Promise<{ error?: string }>
  initial?: {
    id: string
    title: string
    category_id: string | null
    description: string | null
    estimated_duration_minutes: number
    is_active: boolean
    points: ExistingPoint[]
  }
}

const POINT_TYPES: Array<{ value: TemplatePoint['point_type']; label: string }> = [
  { value: 'key_point', label: 'Key Point' },
  { value: 'discussion_question', label: 'Discussion Question' },
  { value: 'action_item', label: 'Action Item' },
]

export default function TemplateForm({ categories, action, initial }: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [points, setPoints] = useState<TemplatePoint[]>(
    initial?.points.length
      ? initial.points
          .sort((a, b) => a.point_number - b.point_number)
          .map(p => ({ uid: crypto.randomUUID(), point_text: p.point_text, point_type: p.point_type as TemplatePoint['point_type'] }))
      : [{ uid: crypto.randomUUID(), point_text: '', point_type: 'key_point' }]
  )

  function addPoint() {
    setPoints(prev => [...prev, { uid: crypto.randomUUID(), point_text: '', point_type: 'key_point' }])
  }

  function removePoint(uid: string) {
    if (points.length === 1) return
    setPoints(prev => prev.filter(p => p.uid !== uid))
  }

  function updatePoint(uid: string, field: keyof Omit<TemplatePoint, 'uid'>, value: string) {
    setPoints(prev => prev.map(p => p.uid === uid ? { ...p, [field]: value } : p))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    if (initial) fd.set('id', initial.id)
    fd.set('is_active', String(isActive))

    const validPoints = points
      .map(p => ({ ...p, point_text: p.point_text.trim() }))
      .filter(p => p.point_text)
    fd.set('points_json', JSON.stringify(validPoints.map(p => ({
      point_text: p.point_text,
      point_type: p.point_type,
    }))))

    const result = await action(fd)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const pointTypeColor: Record<string, string> = {
    key_point: '#0f62fe',
    discussion_question: '#6929c4',
    action_item: '#da1e28',
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
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Template Details
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <TextInput
                id="title"
                name="title"
                labelText="Title"
                placeholder="e.g. Working at Heights Safety Briefing"
                defaultValue={initial?.title ?? ''}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <Select
                id="category_id"
                name="category_id"
                labelText="Category"
                defaultValue={initial?.category_id ?? ''}
              >
                <SelectItem value="" text="— No category —" />
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id} text={c.name} />
                ))}
              </Select>
              <TextInput
                id="estimated_duration_minutes"
                name="estimated_duration_minutes"
                labelText="Estimated Duration (minutes)"
                type="number"
                min="1"
                max="480"
                defaultValue={String(initial?.estimated_duration_minutes ?? 10)}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <TextArea
                id="description"
                name="description"
                labelText="Description (optional)"
                placeholder="Brief description of when and why this talk should be delivered…"
                rows={3}
                defaultValue={initial?.description ?? ''}
              />
            </div>

            {initial && (
              <Toggle
                id="is_active"
                labelText="Active"
                labelA="Inactive"
                labelB="Active"
                toggled={isActive}
                onToggle={val => setIsActive(val)}
              />
            )}
          </Tile>

          {/* Discussion Points */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>
                  Discussion Points
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                  Key points, discussion questions, and action items to cover during the talk.
                </p>
              </div>
              <Button kind="ghost" size="sm" renderIcon={Add} type="button" onClick={addPoint}>
                Add Point
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {points.map((pt, idx) => (
                <div
                  key={pt.uid}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr auto',
                    gap: '0.75rem',
                    alignItems: 'flex-end',
                    padding: '1rem',
                    backgroundColor: '#f4f4f4',
                    borderLeft: `3px solid ${pointTypeColor[pt.point_type] ?? '#525252'}`,
                  }}
                >
                  <TextInput
                    id={`point-text-${pt.uid}`}
                    labelText={idx === 0 ? 'Point Text' : ''}
                    placeholder="Enter discussion point…"
                    value={pt.point_text}
                    onChange={e => updatePoint(pt.uid, 'point_text', e.target.value)}
                    hideLabel={idx > 0}
                  />
                  <Select
                    id={`point-type-${pt.uid}`}
                    labelText={idx === 0 ? 'Type' : ''}
                    hideLabel={idx > 0}
                    value={pt.point_type}
                    onChange={e => updatePoint(pt.uid, 'point_type', e.target.value as TemplatePoint['point_type'])}
                  >
                    {POINT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} text={t.label} />
                    ))}
                  </Select>
                  {points.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePoint(pt.uid)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#da1e28', padding: '0.5rem', display: 'flex',
                        alignItems: 'center', flexShrink: 0,
                      }}
                      aria-label="Remove point"
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
              {loading ? 'Saving…' : initial ? 'Save Changes' : 'Create Template'}
            </Button>
            <Button
              kind="secondary"
              href={initial ? `/toolbox/templates/${initial.id}` : '/toolbox/templates'}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
