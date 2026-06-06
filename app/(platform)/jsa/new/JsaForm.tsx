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
} from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'

interface Site {
  id: string
  name: string
}

interface JsaStep {
  id: string
  description: string
}

interface Props {
  sites: Site[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export default function JsaForm({ sites, action }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<JsaStep[]>([{ id: crypto.randomUUID(), description: '' }])

  function addStep() {
    setSteps(prev => [...prev, { id: crypto.randomUUID(), description: '' }])
  }

  function removeStep(id: string) {
    if (steps.length === 1) return
    setSteps(prev => prev.filter(s => s.id !== id))
  }

  function updateStep(id: string, description: string) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, description } : s))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const fd = new FormData(form)

    // Append steps as JSON so the server action can optionally read them
    // (the createJsa action inserts the JSA header and redirects to the detail
    //  page where steps are added interactively; we still pass them along for
    //  forward-compatibility)
    fd.set('steps_json', JSON.stringify(steps.filter(s => s.description.trim())))

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

          {/* Basic Information */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Basic Information
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <TextInput
                id="title"
                name="title"
                labelText="Job Title / Task Name"
                placeholder="e.g. Working at Heights — Roof Inspection"
                required
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <TextArea
                id="job_description"
                name="job_description"
                labelText="Job Description"
                placeholder="Describe the work to be performed in detail…"
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <TextInput
                id="location"
                name="location"
                labelText="Location"
                placeholder="e.g. Level 3 Plant Room, Site B"
              />
              {sites.length > 0 ? (
                <Select id="site_id" name="site_id" labelText="Site (optional)">
                  <SelectItem value="" text="No specific site" />
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id} text={s.name} />
                  ))}
                </Select>
              ) : (
                <input type="hidden" name="site_id" value="" />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <TextInput
                id="valid_from"
                name="valid_from"
                labelText="Valid From"
                type="date"
              />
              <TextInput
                id="valid_until"
                name="valid_until"
                labelText="Valid Until"
                type="date"
              />
            </div>
          </Tile>

          {/* Job Steps */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>
                  Job Steps
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                  Break the job into sequential steps. Hazards and controls can be added after saving.
                </p>
              </div>
              <Button
                kind="ghost"
                size="sm"
                renderIcon={Add}
                type="button"
                onClick={addStep}
              >
                Add Step
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '1rem',
                    backgroundColor: '#f4f4f4',
                    borderLeft: '3px solid #0f62fe',
                  }}
                >
                  <div
                    style={{
                      minWidth: '1.75rem',
                      height: '1.75rem',
                      borderRadius: '50%',
                      backgroundColor: '#0f62fe',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: '0.125rem',
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextInput
                      id={`step-${step.id}`}
                      labelText=""
                      placeholder={`Describe step ${idx + 1}…`}
                      value={step.description}
                      onChange={e => updateStep(step.id, e.target.value)}
                      hideLabel
                    />
                  </div>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#da1e28',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        marginTop: '0.25rem',
                        flexShrink: 0,
                      }}
                      aria-label="Remove step"
                    >
                      <TrashCan size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {steps.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No steps added.{' '}
                <button
                  type="button"
                  onClick={addStep}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f62fe', fontSize: '0.875rem' }}
                >
                  Add the first step
                </button>
              </div>
            )}
          </Tile>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" kind="primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create JSA'}
            </Button>
            <Button kind="secondary" href="/jsa" disabled={loading}>
              Cancel
            </Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
