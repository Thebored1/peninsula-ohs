'use client'

import { useState } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  Select,
  SelectItem,
  TextInput,
  TextArea,
  Toggle,
  InlineNotification,
  FormGroup,
  Tag,
} from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'

interface InspectionType {
  id: string
  name: string
}

interface Props {
  inspectionTypes: InspectionType[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

interface QuestionDraft {
  key: string
  question_text: string
  question_type: string
  is_required: boolean
  is_scored: boolean
  weight: number
  options: string
  fail_on_no: boolean
  action_required_on_fail: boolean
  suggested_action: string
}

const QUESTION_TYPES = [
  { value: 'pass_fail', label: 'Pass / Fail' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'text', label: 'Text' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'photo', label: 'Photo' },
  { value: 'signature', label: 'Signature' },
  { value: 'date_time', label: 'Date & Time' },
]

let keyCounter = 1

function newQuestion(): QuestionDraft {
  return {
    key: `q_${keyCounter++}`,
    question_text: '',
    question_type: 'pass_fail',
    is_required: true,
    is_scored: true,
    weight: 1,
    options: '',
    fail_on_no: true,
    action_required_on_fail: false,
    suggested_action: '',
  }
}

export function TemplateForm({ inspectionTypes, action }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()])

  function updateQuestion(key: string, patch: Partial<QuestionDraft>) {
    setQuestions(prev => prev.map(q => (q.key === key ? { ...q, ...patch } : q)))
  }

  function removeQuestion(key: string) {
    setQuestions(prev => prev.filter(q => q.key !== key))
  }

  function addQuestion() {
    setQuestions(prev => [...prev, newQuestion()])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (questions.length === 0) {
      setError('Add at least one question before saving.')
      return
    }

    const emptyQ = questions.find(q => !q.question_text.trim())
    if (emptyQ) {
      setError('All questions must have question text.')
      return
    }

    setLoading(true)

    const fd = new FormData(e.currentTarget)

    // Build questions payload
    const payload = questions.map(q => {
      let fail_condition: Record<string, unknown> | null = null
      let options: string[] | null = null

      if (q.question_type === 'yes_no') {
        fail_condition = q.fail_on_no ? { fail_on: 'no' } : null
      } else if (q.question_type === 'multiple_choice' && q.options.trim()) {
        options = q.options.split(',').map(s => s.trim()).filter(Boolean)
      }

      return {
        question_text: q.question_text,
        question_type: q.question_type,
        is_required: q.is_required,
        is_scored: q.is_scored,
        weight: q.weight,
        options,
        fail_condition,
        action_required_on_fail: q.action_required_on_fail,
        suggested_action: q.suggested_action || null,
      }
    })

    fd.set('questions_json', JSON.stringify(payload))

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

          {/* Template header */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#161616',
                marginBottom: '1.5rem',
              }}
            >
              Template Details
            </h2>
            <FormGroup legendText="">
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="name"
                      name="name"
                      labelText="Template Name"
                      placeholder="e.g. Daily Site Walkthrough"
                      required
                    />
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Select
                      id="inspection_type_id"
                      name="inspection_type_id"
                      labelText="Inspection Type"
                      required
                    >
                      <SelectItem value="" text="Select a type…" />
                      {inspectionTypes.map(t => (
                        <SelectItem key={t.id} value={t.id} text={t.name} />
                      ))}
                    </Select>
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="passing_score_threshold"
                      name="passing_score_threshold"
                      labelText="Passing Score (%)"
                      type="number"
                      defaultValue="80"
                      min="0"
                      max="100"
                    />
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="estimated_duration_minutes"
                      name="estimated_duration_minutes"
                      labelText="Estimated Duration (minutes)"
                      type="number"
                      min="0"
                      placeholder="e.g. 30"
                    />
                  </div>
                </Column>
                <Column sm={4} md={8} lg={16}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextArea
                      id="description"
                      name="description"
                      labelText="Description (optional)"
                      placeholder="Brief summary shown when selecting this template"
                      rows={2}
                    />
                  </div>
                </Column>
                <Column sm={4} md={8} lg={16}>
                  <TextArea
                    id="instructions"
                    name="instructions"
                    labelText="Inspector Instructions (optional)"
                    placeholder="Shown to the inspector before they start"
                    rows={2}
                  />
                </Column>
              </Grid>
            </FormGroup>
          </Tile>

          {/* Questions builder */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616' }}>
              Questions{' '}
              <Tag type="blue" size="sm">
                {questions.length}
              </Tag>
            </h2>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Add}
              iconDescription="Add question"
              onClick={addQuestion}
            >
              Add Question
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {questions.map((q, qi) => (
              <Tile key={q.key} style={{ padding: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem',
                    gap: '1rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0f62fe',
                      paddingTop: '0.25rem',
                    }}
                  >
                    Q{qi + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <TextInput
                      id={`qt_${q.key}`}
                      labelText="Question"
                      value={q.question_text}
                      onChange={e => updateQuestion(q.key, { question_text: e.target.value })}
                      placeholder="Enter question text…"
                      required
                    />
                  </div>
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={TrashCan}
                    iconDescription="Remove question"
                    hasIconOnly
                    onClick={() => removeQuestion(q.key)}
                    style={{ marginTop: '1.5rem', color: '#da1e28' }}
                  />
                </div>

                <Grid condensed>
                  <Column sm={4} md={3} lg={5}>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <Select
                        id={`qtype_${q.key}`}
                        labelText="Type"
                        value={q.question_type}
                        onChange={e => updateQuestion(q.key, { question_type: e.target.value })}
                      >
                        {QUESTION_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value} text={t.label} />
                        ))}
                      </Select>
                    </div>
                  </Column>

                  {q.question_type === 'multiple_choice' && (
                    <Column sm={4} md={5} lg={11}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <TextInput
                          id={`qopts_${q.key}`}
                          labelText="Options (comma-separated)"
                          value={q.options}
                          onChange={e => updateQuestion(q.key, { options: e.target.value })}
                          placeholder="Option A, Option B, Option C"
                        />
                      </div>
                    </Column>
                  )}

                  {q.question_type === 'yes_no' && (
                    <Column sm={4} md={3} lg={5}>
                      <div style={{ marginBottom: '0.75rem', paddingTop: '1.5rem' }}>
                        <Toggle
                          id={`failno_${q.key}`}
                          labelText="Fail on 'No'"
                          labelA="No"
                          labelB="Yes"
                          toggled={q.fail_on_no}
                          onToggle={val => updateQuestion(q.key, { fail_on_no: val })}
                          size="sm"
                        />
                      </div>
                    </Column>
                  )}
                </Grid>

                <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <Toggle
                    id={`req_${q.key}`}
                    labelText="Required"
                    labelA="No"
                    labelB="Yes"
                    toggled={q.is_required}
                    onToggle={val => updateQuestion(q.key, { is_required: val })}
                    size="sm"
                  />
                  <Toggle
                    id={`scored_${q.key}`}
                    labelText="Scored"
                    labelA="No"
                    labelB="Yes"
                    toggled={q.is_scored}
                    onToggle={val => updateQuestion(q.key, { is_scored: val })}
                    size="sm"
                  />
                  <Toggle
                    id={`actonf_${q.key}`}
                    labelText="Action on Fail"
                    labelA="No"
                    labelB="Yes"
                    toggled={q.action_required_on_fail}
                    onToggle={val => updateQuestion(q.key, { action_required_on_fail: val })}
                    size="sm"
                  />
                </div>

                {q.is_scored && (
                  <div style={{ marginBottom: '0.75rem', maxWidth: '150px' }}>
                    <TextInput
                      id={`weight_${q.key}`}
                      labelText="Weight"
                      type="number"
                      min="1"
                      max="10"
                      value={String(q.weight)}
                      onChange={e =>
                        updateQuestion(q.key, { weight: parseInt(e.target.value, 10) || 1 })
                      }
                    />
                  </div>
                )}

                {q.action_required_on_fail && (
                  <TextInput
                    id={`sugg_${q.key}`}
                    labelText="Suggested Action (on fail)"
                    value={q.suggested_action}
                    onChange={e => updateQuestion(q.key, { suggested_action: e.target.value })}
                    placeholder="e.g. Repair or replace immediately"
                  />
                )}
              </Tile>
            ))}
          </div>

          <Button
            kind="ghost"
            renderIcon={Add}
            iconDescription="Add question"
            onClick={addQuestion}
            style={{ marginBottom: '2rem' }}
          >
            Add Another Question
          </Button>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" kind="primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Template'}
            </Button>
            <Button kind="secondary" href="/inspections/templates">
              Cancel
            </Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
