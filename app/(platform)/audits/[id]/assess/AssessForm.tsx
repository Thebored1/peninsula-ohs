'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Tile, Button, Select, SelectItem, TextArea, InlineNotification, Tag,
} from '@carbon/react'

interface Outcome {
  id: string; code: string; name: string; colour_code: string
  requires_action: boolean; is_nonconformance: boolean
}

interface Criterion {
  id: string; reference_number: string | null; criterion_text: string
  guidance: string | null; evidence_required: string | null
}

interface Section {
  id: string | null; title: string | null; order: number; criteria: Criterion[]
}

type ExistingFinding = {
  outcome_id: string; finding_text: string | null; recommendation: string | null
  root_cause: string | null; objective_evidence: string | null
} | null | undefined

interface Props {
  auditId: string
  sections: Section[]
  outcomes: Outcome[]
  findingMap: Record<string, ExistingFinding>
  saveAction: (
    auditId: string,
    findings: Array<{
      criterion_id: string; outcome_id: string; finding_text: string | null
      recommendation: string | null; root_cause: string | null; objective_evidence: string | null
    }>
  ) => Promise<{ error?: string }>
  returnUrl: string
}

type FindingState = {
  outcome_id: string
  finding_text: string
  recommendation: string
  root_cause: string
  objective_evidence: string
}

export function AssessForm({ auditId, sections, outcomes, findingMap, saveAction, returnUrl }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const allCriteria = sections.flatMap(s => s.criteria)

  const [findings, setFindings] = useState<Record<string, FindingState>>(() => {
    const init: Record<string, FindingState> = {}
    for (const c of allCriteria) {
      const ex = findingMap[c.id]
      init[c.id] = {
        outcome_id: ex?.outcome_id ?? '',
        finding_text: ex?.finding_text ?? '',
        recommendation: ex?.recommendation ?? '',
        root_cause: ex?.root_cause ?? '',
        objective_evidence: ex?.objective_evidence ?? '',
      }
    }
    return init
  })

  function update(criterionId: string, patch: Partial<FindingState>) {
    setFindings(prev => ({ ...prev, [criterionId]: { ...prev[criterionId], ...patch } }))
    setSaved(false)
  }

  function getOutcome(id: string) { return outcomes.find(o => o.id === id) ?? null }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)
    const payload = allCriteria
      .filter(c => findings[c.id]?.outcome_id)
      .map(c => ({
        criterion_id: c.id,
        outcome_id: findings[c.id].outcome_id,
        finding_text: findings[c.id].finding_text || null,
        recommendation: findings[c.id].recommendation || null,
        root_cause: findings[c.id].root_cause || null,
        objective_evidence: findings[c.id].objective_evidence || null,
      }))
    const result = await saveAction(auditId, payload)
    setSaving(false)
    if (result?.error) setError(result.error)
    else setSaved(true)
  }

  async function handleSaveReturn() {
    await handleSave()
    if (!error) router.push(returnUrl)
  }

  const outcomeTypeMap: Record<string, 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'> = {
    conformance: 'green', minor_nc: 'teal', major_nc: 'red',
    observation: 'blue', opportunity_for_improvement: 'purple', not_applicable: 'gray',
  }

  return (
    <div>
      {error && <div style={{ marginBottom: '1.5rem' }}><InlineNotification kind="error" title="Error" subtitle={error} lowContrast /></div>}
      {saved && <div style={{ marginBottom: '1.5rem' }}><InlineNotification kind="success" title="Saved" subtitle="Findings saved successfully." lowContrast /></div>}

      {sections.map((section, si) => (
        <div key={section.id ?? `unsec_${si}`} style={{ marginBottom: '2rem' }}>
          {section.title && (
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #0f62fe' }}>
              {section.title}
            </h2>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {section.criteria.map((c, ci) => {
              const f = findings[c.id]
              const selectedOutcome = f?.outcome_id ? getOutcome(f.outcome_id) : null
              const isNc = selectedOutcome?.is_nonconformance ?? false

              return (
                <Tile key={c.id} style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                    {c.reference_number && (
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#6f6f6f', paddingTop: '0.125rem', minWidth: '2.5rem' }}>
                        {c.reference_number}
                      </span>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#161616', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#6f6f6f', marginRight: '0.5rem', fontSize: '0.75rem' }}>{si + 1}.{ci + 1}</span>
                        {c.criterion_text}
                      </p>
                      {c.guidance && <p style={{ fontSize: '0.8125rem', color: '#6f6f6f' }}>{c.guidance}</p>}
                      {c.evidence_required && (
                        <p style={{ fontSize: '0.8125rem', color: '#525252', marginTop: '0.25rem' }}>
                          Evidence required: {c.evidence_required}
                        </p>
                      )}
                    </div>
                    {selectedOutcome && (
                      <Tag type={outcomeTypeMap[selectedOutcome.code] ?? 'gray'} size="sm">{selectedOutcome.name}</Tag>
                    )}
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <Select
                      id={`outcome_${c.id}`}
                      labelText="Outcome"
                      value={f?.outcome_id ?? ''}
                      onChange={e => update(c.id, { outcome_id: e.target.value })}
                    >
                      <SelectItem value="" text="Select outcome…" />
                      {outcomes.map(o => <SelectItem key={o.id} value={o.id} text={o.name} />)}
                    </Select>
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <TextArea
                      id={`finding_${c.id}`}
                      labelText="Finding"
                      value={f?.finding_text ?? ''}
                      onChange={e => update(c.id, { finding_text: e.target.value })}
                      rows={2}
                      placeholder="What was observed or found…"
                    />
                  </div>

                  {f?.outcome_id && (
                    <>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <TextArea
                          id={`evidence_${c.id}`}
                          labelText="Objective Evidence"
                          value={f?.objective_evidence ?? ''}
                          onChange={e => update(c.id, { objective_evidence: e.target.value })}
                          rows={1}
                          placeholder="Facts supporting this finding…"
                        />
                      </div>
                      {isNc && (
                        <>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <TextArea
                              id={`root_${c.id}`}
                              labelText="Root Cause"
                              value={f?.root_cause ?? ''}
                              onChange={e => update(c.id, { root_cause: e.target.value })}
                              rows={1}
                              placeholder="Why did this non-conformance occur?"
                            />
                          </div>
                          <TextArea
                            id={`rec_${c.id}`}
                            labelText="Recommendation"
                            value={f?.recommendation ?? ''}
                            onChange={e => update(c.id, { recommendation: e.target.value })}
                            rows={1}
                            placeholder="Corrective action recommended…"
                          />
                        </>
                      )}
                    </>
                  )}
                </Tile>
              )
            })}
          </div>
        </div>
      ))}

      <div style={{ position: 'sticky', bottom: 0, backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', padding: '1rem 0', marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Button kind="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Findings'}</Button>
        <Button kind="secondary" onClick={handleSaveReturn} disabled={saving}>Save & Return</Button>
        <Button kind="ghost" href={returnUrl}>Back without saving</Button>
      </div>
    </div>
  )
}
