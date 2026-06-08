'use client'

import { useState, useTransition } from 'react'
import { Button, InlineNotification, Tag } from '@carbon/react'
import { Document } from '@carbon/icons-react'
import { generateHireDocuments } from '@/app/actions/hiring'

interface HrTemplate {
  id: string
  name: string
  template_type: string
  description: string | null
  is_system_template: boolean
}

interface HireDocument {
  id: string
  document_type: string
  file_name: string
  candidate_signed_at: string | null
}

interface Props {
  hireId: string
  availableTemplates: HrTemplate[]
  existingDocuments: HireDocument[]
  onComplete: () => void
}

const TYPE_LABELS: Record<string, string> = {
  offer_letter: 'Offer Letter',
  employment_contract: 'Employment Contract',
  nda: 'NDA',
  policy_acknowledgement: 'Policy Acknowledgement',
  probation_notice: 'Probation Notice',
  custom: 'Custom',
}

export function DocumentGenerationPanel({ hireId, availableTemplates, existingDocuments, onComplete }: Props) {
  const [selected, setSelected] = useState<string[]>(
    // Default: select system templates of common types
    availableTemplates
      .filter(t => t.is_system_template && (t.template_type === 'offer_letter' || t.template_type === 'employment_contract'))
      .map(t => t.id)
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggleTemplate(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleGenerate() {
    if (selected.length === 0) { setError('Select at least one document template'); return }
    setError(null)
    startTransition(async () => {
      const result = await generateHireDocuments(hireId, selected)
      if (result?.error) { setError(result.error); return }
      onComplete()
    })
  }

  const hasExisting = existingDocuments.length > 0

  return (
    <div>
      {error && (
        <InlineNotification kind="error" title="Error" subtitle={error}
          onCloseButtonClick={() => setError(null)} style={{ marginBottom: '1rem', maxWidth: '100%' }} />
      )}

      {hasExisting && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.75rem' }}>
            Generated Documents
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {existingDocuments.map(doc => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', border: '1px solid #e0e0e0', backgroundColor: '#f4f4f4',
              }}>
                <Document size={16} style={{ color: '#525252' }} />
                <span style={{ flex: 1, fontSize: '0.875rem', color: '#161616' }}>{doc.file_name}</span>
                <Tag type={doc.candidate_signed_at ? 'green' : 'gray'} size="sm">
                  {doc.candidate_signed_at ? 'Signed' : 'Pending signature'}
                </Tag>
              </div>
            ))}
          </div>
          {existingDocuments.every(d => !d.candidate_signed_at) === false && (
            <Button kind="primary" style={{ marginTop: '1rem' }} onClick={onComplete}>
              Continue to Signature Collection
            </Button>
          )}
        </div>
      )}

      {!hasExisting && (
        <>
          <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1.5rem' }}>
            Select which documents to generate for this hire. They will be pre-populated with the candidate's details and the correct province-specific clauses.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {availableTemplates.map(t => (
              <label
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                  padding: '0.875rem 1rem',
                  border: `1px solid ${selected.includes(t.id) ? '#0f62fe' : '#e0e0e0'}`,
                  backgroundColor: selected.includes(t.id) ? '#edf5ff' : '#fff',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(t.id)}
                  onChange={() => toggleTemplate(t.id)}
                  style={{ cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>{t.name}</span>
                    <Tag type={t.is_system_template ? 'blue' : 'gray'} size="sm">
                      {t.is_system_template ? 'System' : 'Custom'}
                    </Tag>
                    <Tag type="gray" size="sm">{TYPE_LABELS[t.template_type] ?? t.template_type}</Tag>
                  </div>
                  {t.description && (
                    <p style={{ fontSize: '0.8125rem', color: '#6f6f6f' }}>{t.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          <Button kind="primary" disabled={isPending || selected.length === 0} onClick={handleGenerate}>
            {isPending ? 'Generating PDFs…' : `Generate ${selected.length} Document${selected.length !== 1 ? 's' : ''}`}
          </Button>
        </>
      )}
    </div>
  )
}
