'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Tile,
  Button,
  RadioButtonGroup,
  RadioButton,
  TextArea,
  TextInput,
  Select,
  SelectItem,
  Toggle,
  InlineNotification,
  Tag,
} from '@carbon/react'

type QuestionType =
  | 'pass_fail'
  | 'yes_no'
  | 'numeric'
  | 'text'
  | 'multiple_choice'
  | 'photo'
  | 'signature'
  | 'date_time'

interface Question {
  id: string
  question_text: string
  help_text: string | null
  question_type: QuestionType
  is_required: boolean
  options: string | null
  action_required_on_fail: boolean
  suggested_action: string | null
}

interface Section {
  id: string | null
  title: string | null
  order: number
  questions: Question[]
}

type ExistingResponse = {
  response_value: string | null
  response_numeric: number | null
  is_na: boolean
  notes: string | null
}

interface Props {
  inspectionId: string
  sections: Section[]
  responseMap: Record<string, ExistingResponse>
  saveAction: (
    inspectionId: string,
    responses: Array<{
      question_id: string
      response_value: string | null
      response_numeric: number | null
      is_na: boolean
      notes: string | null
    }>
  ) => Promise<{ error?: string }>
  returnUrl: string
}

type ResponseState = {
  value: string
  numeric: string
  isNa: boolean
  notes: string
}

export function ConductForm({ inspectionId, sections, responseMap, saveAction, returnUrl }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const allQuestions = sections.flatMap(s => s.questions)

  // Initialise state from existing responses
  const [responses, setResponses] = useState<Record<string, ResponseState>>(() => {
    const init: Record<string, ResponseState> = {}
    for (const q of allQuestions) {
      const existing = responseMap[q.id]
      init[q.id] = {
        value: existing?.response_value ?? '',
        numeric: existing?.response_numeric != null ? String(existing.response_numeric) : '',
        isNa: existing?.is_na ?? false,
        notes: existing?.notes ?? '',
      }
    }
    return init
  })

  function update(questionId: string, patch: Partial<ResponseState>) {
    setResponses(prev => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const payload = allQuestions.map(q => {
      const r = responses[q.id]
      return {
        question_id: q.id,
        response_value:
          ['pass_fail', 'yes_no', 'text', 'multiple_choice', 'signature'].includes(q.question_type)
            ? r.value || null
            : null,
        response_numeric:
          q.question_type === 'numeric' && r.numeric !== ''
            ? parseFloat(r.numeric)
            : null,
        is_na: r.isNa,
        notes: r.notes || null,
      }
    })

    const result = await saveAction(inspectionId, payload)
    setSaving(false)

    if (result?.error) {
      setError(result.error)
    } else {
      setSaved(true)
    }
  }

  async function handleSaveAndReturn() {
    await handleSave()
    if (!error) router.push(returnUrl)
  }

  function parseOptions(raw: string | null): string[] {
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return raw.split(',').map(s => s.trim()).filter(Boolean)
    }
  }

  function renderInput(q: Question) {
    const r = responses[q.id]
    if (!r) return null

    if (r.isNa) {
      return (
        <p style={{ fontSize: '0.875rem', color: '#6f6f6f', fontStyle: 'italic' }}>
          Marked as N/A
        </p>
      )
    }

    switch (q.question_type) {
      case 'pass_fail':
        return (
          <RadioButtonGroup
            legendText=""
            name={`pf_${q.id}`}
            valueSelected={r.value || undefined}
            onChange={val => update(q.id, { value: val as string })}
            orientation="horizontal"
          >
            <RadioButton labelText="Pass" value="pass" id={`pass_${q.id}`} />
            <RadioButton labelText="Fail" value="fail" id={`fail_${q.id}`} />
          </RadioButtonGroup>
        )

      case 'yes_no':
        return (
          <RadioButtonGroup
            legendText=""
            name={`yn_${q.id}`}
            valueSelected={r.value || undefined}
            onChange={val => update(q.id, { value: val as string })}
            orientation="horizontal"
          >
            <RadioButton labelText="Yes" value="yes" id={`yes_${q.id}`} />
            <RadioButton labelText="No" value="no" id={`no_${q.id}`} />
          </RadioButtonGroup>
        )

      case 'text':
        return (
          <TextArea
            id={`text_${q.id}`}
            labelText=""
            hideLabel
            value={r.value}
            onChange={e => update(q.id, { value: e.target.value })}
            rows={2}
            placeholder="Enter your answer…"
          />
        )

      case 'numeric':
        return (
          <TextInput
            id={`num_${q.id}`}
            labelText=""
            hideLabel
            type="number"
            value={r.numeric}
            onChange={e => update(q.id, { numeric: e.target.value })}
            placeholder="0"
            style={{ maxWidth: '200px' }}
          />
        )

      case 'multiple_choice': {
        const opts = parseOptions(q.options)
        return (
          <Select
            id={`mc_${q.id}`}
            labelText=""
            hideLabel
            value={r.value}
            onChange={e => update(q.id, { value: e.target.value })}
          >
            <SelectItem value="" text="Select…" />
            {opts.map(opt => (
              <SelectItem key={opt} value={opt} text={opt} />
            ))}
          </Select>
        )
      }

      case 'photo':
      case 'signature':
        return (
          <p style={{ fontSize: '0.8125rem', color: '#6f6f6f', fontStyle: 'italic' }}>
            {q.question_type === 'photo' ? 'Photo capture' : 'Signature capture'} is available in
            the mobile app.
          </p>
        )

      case 'date_time':
        return (
          <TextInput
            id={`dt_${q.id}`}
            labelText=""
            hideLabel
            type="datetime-local"
            value={r.value}
            onChange={e => update(q.id, { value: e.target.value })}
            style={{ maxWidth: '300px' }}
          />
        )

      default:
        return null
    }
  }

  return (
    <div>
      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <InlineNotification kind="error" title="Error" subtitle={error} lowContrast />
        </div>
      )}
      {saved && (
        <div style={{ marginBottom: '1.5rem' }}>
          <InlineNotification kind="success" title="Saved" subtitle="Responses saved successfully." lowContrast />
        </div>
      )}

      {sections.map((section, si) => (
        <div key={section.id ?? `unsectioned_${si}`} style={{ marginBottom: '1.5rem' }}>
          {section.title && (
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#161616',
                marginBottom: '0.75rem',
                paddingBottom: '0.5rem',
                borderBottom: '2px solid #0f62fe',
              }}
            >
              {section.title}
            </h2>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {section.questions.map((q, qi) => {
              const r = responses[q.id]
              const isAnswered =
                r?.isNa ||
                (q.question_type === 'numeric' ? r?.numeric !== '' : r?.value !== '')

              return (
                <Tile key={q.id} style={{ padding: '1.25rem' }}>
                  {/* Question header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '0.75rem',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', color: '#161616', fontWeight: 500 }}>
                        <span style={{ color: '#6f6f6f', marginRight: '0.5rem' }}>
                          {si + 1}.{qi + 1}
                        </span>
                        {q.question_text}
                        {q.is_required && (
                          <span style={{ color: '#da1e28', marginLeft: '0.25rem' }}>*</span>
                        )}
                      </p>
                      {q.help_text && (
                        <p
                          style={{
                            fontSize: '0.8125rem',
                            color: '#6f6f6f',
                            marginTop: '0.25rem',
                          }}
                        >
                          {q.help_text}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                      {isAnswered && (
                        <Tag type="green" size="sm">Answered</Tag>
                      )}
                      <Toggle
                        id={`na_${q.id}`}
                        labelText=""
                        labelA="N/A"
                        labelB="N/A"
                        size="sm"
                        toggled={r?.isNa ?? false}
                        onToggle={val => update(q.id, { isNa: val })}
                      />
                    </div>
                  </div>

                  {/* Response input */}
                  <div style={{ marginBottom: '0.75rem' }}>{renderInput(q)}</div>

                  {/* Notes */}
                  {!r?.isNa && (
                    <TextArea
                      id={`notes_${q.id}`}
                      labelText="Notes (optional)"
                      value={r?.notes ?? ''}
                      onChange={e => update(q.id, { notes: e.target.value })}
                      rows={1}
                      placeholder="Additional notes…"
                    />
                  )}

                  {/* Action hint on fail */}
                  {q.action_required_on_fail && q.suggested_action && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#fff8e1',
                        borderLeft: '3px solid #f1c21b',
                        fontSize: '0.8125rem',
                        color: '#525252',
                      }}
                    >
                      If failed — suggested action: {q.suggested_action}
                    </div>
                  )}
                </Tile>
              )
            })}
          </div>
        </div>
      ))}

      {/* Save bar */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e0e0e0',
          padding: '1rem 0',
          marginTop: '2rem',
          display: 'flex',
          gap: '1rem',
        }}
      >
        <Button kind="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Responses'}
        </Button>
        <Button kind="secondary" onClick={handleSaveAndReturn} disabled={saving}>
          Save & Return to Inspection
        </Button>
        <Button kind="ghost" href={returnUrl}>
          Back without saving
        </Button>
      </div>
    </div>
  )
}
