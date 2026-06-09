'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@supabase/supabase-js'

export interface Question {
  id: string
  question_text: string
  question_type: 'rating' | 'yes_no' | 'open_text' | 'multiple_choice'
  options: unknown
  is_required: boolean
  display_order: number
}

interface Props {
  token: string
  requestId: string
  refereeName: string
  candidateName: string
  positionTitle: string
  questions: Question[]
}

async function submitReference(requestId: string, answers: Record<string, unknown>): Promise<{ error?: string }> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Insert responses
  const rows = Object.entries(answers).map(([questionId, value]) => ({
    request_id:     requestId,
    question_id:    questionId,
    response_value: JSON.stringify(value),
  }))

  const { error } = await admin.from('bgc_reference_responses').insert(rows)
  if (error) return { error: error.message }

  // Mark request as completed (use service role via API route for this in production)
  await admin.from('bgc_reference_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', requestId)
  return {}
}

export default function ReferenceQuestionnaireForm({ token, requestId, refereeName, candidateName, positionTitle, questions }: Props) {
  const [isPending, startTransition] = useTransition()
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setAnswer(questionId: string, value: unknown) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitReference(requestId, answers)
      if (result.error) { setError(result.error); return }
      setDone(true)
    })
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h1 style={{ fontSize: 24, color: '#161616', marginBottom: 12 }}>Thank you, {refereeName}</h1>
        <p style={{ color: '#525252' }}>Your reference has been submitted. We appreciate you taking the time.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ backgroundColor: '#fff', borderRadius: 4, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#161616', marginBottom: 8 }}>Professional Reference</h1>
        <p style={{ color: '#525252', fontSize: 14, marginBottom: 4 }}>
          <strong>{candidateName}</strong> has listed you as a reference for the <strong>{positionTitle}</strong> role.
        </p>
        <p style={{ color: '#6f6f6f', fontSize: 13, marginBottom: 24 }}>
          Please answer the following questions. Your responses are confidential.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {questions.map(q => (
            <div key={q.id}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#161616', marginBottom: 6 }}>
                {q.question_text}
                {q.is_required && <span style={{ color: '#da1e28' }}> *</span>}
              </label>

              {q.question_type === 'open_text' && (
                <textarea
                  required={q.is_required}
                  rows={4}
                  value={(answers[q.id] as string) ?? ''}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #8d8d8d', borderRadius: 2, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                />
              )}

              {q.question_type === 'yes_no' && (
                <div style={{ display: 'flex', gap: 16 }}>
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        required={q.is_required}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswer(q.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {q.question_type === 'rating' && (() => {
                const opts = (q.options as Record<string, unknown>) ?? { min: 1, max: 5 }
                const min = opts.min as number ?? 1
                const max = opts.max as number ?? 5
                const labels = (opts.labels as string[]) ?? []
                return (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {labels[0] && <span style={{ fontSize: 12, color: '#525252' }}>{labels[0]}</span>}
                    {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
                      <label key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={q.id}
                          value={n}
                          required={q.is_required}
                          checked={answers[q.id] === n}
                          onChange={() => setAnswer(q.id, n)}
                        />
                        <span style={{ fontSize: 12 }}>{n}</span>
                      </label>
                    ))}
                    {labels[1] && <span style={{ fontSize: 12, color: '#525252' }}>{labels[1]}</span>}
                  </div>
                )
              })()}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ backgroundColor: '#fff1f1', border: '1px solid #fa4d56', borderRadius: 2, padding: '10px 14px', marginTop: 16, color: '#da1e28', fontSize: 14 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          style={{ marginTop: 24, backgroundColor: '#0f62fe', color: '#fff', border: 'none', borderRadius: 2, padding: '12px 32px', fontSize: 16, fontWeight: 600, cursor: 'pointer', width: '100%' }}
        >
          {isPending ? 'Submitting…' : 'Submit Reference'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#6f6f6f', textAlign: 'center' }}>Your responses are confidential and will only be used to assist with this hiring decision.</p>
    </form>
  )
}
