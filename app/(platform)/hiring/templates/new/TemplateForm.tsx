'use client'

import { useState, useTransition } from 'react'
import { Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem, InlineNotification } from '@carbon/react'
import { createHrTemplate } from '@/app/actions/hiring'

const TEMPLATE_TYPES = [
  { value: 'offer_letter', label: 'Letter of Offer' },
  { value: 'employment_contract', label: 'Employment Contract' },
  { value: 'nda', label: 'Non-Disclosure Agreement' },
  { value: 'policy_acknowledgement', label: 'Policy Acknowledgement' },
  { value: 'probation_notice', label: 'Probation Notice' },
  { value: 'custom', label: 'Custom' },
]

const PROVINCES = [
  { code: 'ON', name: 'Ontario' }, { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' }, { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' }, { code: 'MB', name: 'Manitoba' },
  { code: 'NS', name: 'Nova Scotia' }, { code: 'NB', name: 'New Brunswick' },
  { code: 'PE', name: 'PEI' }, { code: 'NL', name: 'Newfoundland' },
]

export function TemplateForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showProvinceClauses, setShowProvinceClauses] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createHrTemplate(formData)
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
                    <TextInput id="name" name="name" labelText="Template Name *" required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select id="template_type" name="template_type" labelText="Document Type *" defaultValue="custom">
                      {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value} text={t.label} />)}
                    </Select>
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="description" name="description" labelText="Description" rows={2} />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Template Content</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.8125rem', color: '#6f6f6f', marginBottom: '1rem' }}>
                  Use <code>{'{{variable_name}}'}</code> tokens for dynamic content. Common variables: <code>{'{{employee_full_name}}'}</code>, <code>{'{{position_title}}'}</code>, <code>{'{{start_date}}'}</code>, <code>{'{{employer_name}}'}</code>, <code>{'{{probation_period}}'}</code>.
                </p>
                <TextArea
                  id="body_content"
                  name="body_content"
                  labelText="Document Body *"
                  rows={20}
                  required
                  style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                />
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Province / Jurisdiction</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f', marginBottom: '1rem' }}>
                  Optionally restrict this template to specific provinces and add province-specific clauses appended at the end of the document.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  {PROVINCES.map(p => (
                    <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="checkbox" name="applicable_provinces" value={p.code} style={{ cursor: 'pointer' }} />
                      <strong>{p.code}</strong> — {p.name}
                    </label>
                  ))}
                </div>
                <Button kind="ghost" size="sm" onClick={() => setShowProvinceClauses(v => !v)} type="button">
                  {showProvinceClauses ? 'Hide province clause fields' : 'Add province-specific clauses'}
                </Button>
                {showProvinceClauses && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {PROVINCES.map(p => (
                      <div key={p.code}>
                        <TextArea
                          id={`province_clause_${p.code}`}
                          name={`province_clause_${p.code}`}
                          labelText={`${p.code} — ${p.name} clause (optional)`}
                          rows={3}
                          placeholder={`Jurisdiction-specific clause for ${p.name}…`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Template'}</Button>
              <Button kind="ghost" href="/hiring/templates">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </form>
    </div>
  )
}
