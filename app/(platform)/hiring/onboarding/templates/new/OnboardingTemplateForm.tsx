'use client'

import { useState, useTransition } from 'react'
import { Grid, Column, Tile, Button, TextInput, TextArea, InlineNotification } from '@carbon/react'
import { createOnboardingTemplate } from '@/app/actions/hiring'

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Permanent Full-Time' },
  { value: 'part_time', label: 'Permanent Part-Time' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'casual', label: 'Casual' },
]

export function OnboardingTemplateForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createOnboardingTemplate(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <InlineNotification kind="error" title="Error" subtitle={error}
          onCloseButtonClick={() => setError(null)} style={{ marginBottom: '1.5rem', maxWidth: '100%' }} />
      )}
      <form onSubmit={handleSubmit}>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Template Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput id="name" name="name" labelText="Template Name *" required placeholder="e.g. Full-Time Employee Onboarding" />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="description" name="description" labelText="Description" rows={3}
                      placeholder="Describe when this template is used…" />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Employment Types</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f', marginBottom: '1rem' }}>
                  Select which employment types this template applies to. Leave blank to apply to all.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {EMPLOYMENT_TYPES.map(t => (
                    <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="checkbox" name="employment_types" value={t.value} style={{ cursor: 'pointer' }} />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Template'}</Button>
              <Button kind="ghost" href="/hiring/onboarding/templates">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </form>
    </div>
  )
}
