'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  InlineNotification, FormGroup, Tag,
} from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'

interface AuditType { id: string; name: string }
interface Props {
  auditTypes: AuditType[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

interface CriterionDraft {
  key: string
  reference_number: string
  criterion_text: string
  guidance: string
  evidence_required: string
}

let keyCounter = 1
function newCriterion(): CriterionDraft {
  return { key: `c_${keyCounter++}`, reference_number: '', criterion_text: '', guidance: '', evidence_required: '' }
}

export function AuditTemplateForm({ auditTypes, action }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [criteria, setCriteria] = useState<CriterionDraft[]>([newCriterion()])

  function updateCriterion(key: string, patch: Partial<CriterionDraft>) {
    setCriteria(prev => prev.map(c => c.key === key ? { ...c, ...patch } : c))
  }
  function removeCriterion(key: string) { setCriteria(prev => prev.filter(c => c.key !== key)) }
  function addCriterion() { setCriteria(prev => [...prev, newCriterion()]) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (criteria.length === 0) { setError('Add at least one criterion.'); return }
    const empty = criteria.find(c => !c.criterion_text.trim())
    if (empty) { setError('All criteria must have criterion text.'); return }
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const payload = criteria.map(c => ({
      reference_number: c.reference_number || null,
      criterion_text: c.criterion_text,
      guidance: c.guidance || null,
      evidence_required: c.evidence_required || null,
    }))
    fd.set('criteria_json', JSON.stringify(payload))
    const result = await action(fd)
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Grid>
        <Column sm={4} md={8} lg={12}>
          {error && <div style={{ marginBottom: '1rem' }}><InlineNotification kind="error" title="Error" subtitle={error} lowContrast /></div>}

          <Tile style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>Template Details</h2>
            <FormGroup legendText="">
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput id="name" name="name" labelText="Template Name" placeholder="e.g. ISO 45001 Internal Audit Checklist" required />
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Select id="audit_type_id" name="audit_type_id" labelText="Audit Type (optional)">
                      <SelectItem value="" text="No type" />
                      {auditTypes.map(t => <SelectItem key={t.id} value={t.id} text={t.name} />)}
                    </Select>
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput id="standard_reference" name="standard_reference" labelText="Standard Reference (optional)" placeholder="e.g. ISO 45001:2018, WHS Regulation 2017" />
                  </div>
                </Column>
                <Column sm={4} md={8} lg={16}>
                  <TextArea id="description" name="description" labelText="Description (optional)" rows={2} placeholder="What this template is designed to audit…" />
                </Column>
              </Grid>
            </FormGroup>
          </Tile>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616' }}>
              Criteria <Tag type="blue" size="sm">{criteria.length}</Tag>
            </h2>
            <Button kind="ghost" size="sm" renderIcon={Add} iconDescription="Add criterion" onClick={addCriterion}>
              Add Criterion
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {criteria.map((c, ci) => (
              <Tile key={c.key} style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f62fe', paddingTop: '0.25rem', minWidth: '1.5rem' }}>{ci + 1}.</span>
                  <div style={{ flex: 1 }}>
                    <TextInput
                      id={`ct_${c.key}`}
                      labelText="Criterion"
                      value={c.criterion_text}
                      onChange={e => updateCriterion(c.key, { criterion_text: e.target.value })}
                      placeholder="The requirement being assessed…"
                      required
                    />
                  </div>
                  <Button kind="ghost" size="sm" renderIcon={TrashCan} iconDescription="Remove" hasIconOnly
                    onClick={() => removeCriterion(c.key)}
                    style={{ marginTop: '1.5rem', color: '#da1e28' }}
                  />
                </div>
                <Grid condensed>
                  <Column sm={4} md={2} lg={4}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <TextInput id={`ref_${c.key}`} labelText="Ref # (optional)" value={c.reference_number}
                        onChange={e => updateCriterion(c.key, { reference_number: e.target.value })}
                        placeholder="e.g. 6.1.2" />
                    </div>
                  </Column>
                  <Column sm={4} md={6} lg={12}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <TextInput id={`guid_${c.key}`} labelText="Auditor Guidance (optional)" value={c.guidance}
                        onChange={e => updateCriterion(c.key, { guidance: e.target.value })}
                        placeholder="How to assess this criterion…" />
                    </div>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <TextInput id={`ev_${c.key}`} labelText="Evidence Required (optional)" value={c.evidence_required}
                      onChange={e => updateCriterion(c.key, { evidence_required: e.target.value })}
                      placeholder="e.g. Training records, inspection logs, documented procedures…" />
                  </Column>
                </Grid>
              </Tile>
            ))}
          </div>

          <Button kind="ghost" renderIcon={Add} iconDescription="Add" onClick={addCriterion} style={{ marginBottom: '2rem' }}>
            Add Another Criterion
          </Button>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" kind="primary" disabled={loading}>{loading ? 'Creating…' : 'Create Template'}</Button>
            <Button kind="secondary" href="/audits/templates">Cancel</Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
