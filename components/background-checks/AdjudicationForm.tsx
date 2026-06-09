'use client'

import { useState, useTransition } from 'react'
import { recordAdjudication } from '@/app/actions/background-checks'

const RECOMMENDATIONS = [
  { value: 'proceed', label: 'Proceed — No concerns identified' },
  { value: 'proceed_with_conditions', label: 'Proceed with Conditions — Concerns noted but not disqualifying' },
  { value: 'do_not_proceed', label: 'Do Not Proceed — Concerns are disqualifying for this role' },
]

export default function AdjudicationForm({ packageId }: { packageId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [humanRightsConfirmed, setHumanRightsConfirmed] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await recordAdjudication(packageId, formData)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: 4, backgroundColor: '#fff' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: 4 }}>Record Adjudication</h2>
      <p style={{ fontSize: '0.8125rem', color: '#525252', marginBottom: '1.5rem' }}>
        Your adjudication is a permanent record. Ensure all results have been reviewed before proceeding.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Human rights confirmation first */}
        <div style={{ backgroundColor: '#fdf6dd', border: '1px solid #f1c21b', borderRadius: 2, padding: '12px 16px', marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              name="human_rights_considered"
              value="yes"
              checked={humanRightsConfirmed}
              onChange={e => setHumanRightsConfirmed(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: '0.8125rem', color: '#393939' }}>
              <strong>I confirm that I have considered my obligations under the Canadian Human Rights Act</strong> and applicable provincial human rights codes.
              Any criminal record findings have been assessed for relevance to this specific role, not treated as automatic disqualification.
            </span>
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: 6 }}>
            Recommendation <span style={{ color: '#da1e28' }}>*</span>
          </label>
          <select
            name="recommendation"
            required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #8d8d8d', borderRadius: 2, fontSize: '0.875rem', backgroundColor: '#fff' }}
          >
            <option value="">Select recommendation…</option>
            {RECOMMENDATIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: 6 }}>
            Rationale <span style={{ color: '#da1e28' }}>*</span>
          </label>
          <p style={{ fontSize: '0.8125rem', color: '#6f6f6f', marginBottom: 6 }}>
            Explain your assessment. If any records were found, note whether they are relevant to this specific role and why.
          </p>
          <textarea
            name="rationale"
            required
            rows={5}
            placeholder="Describe your assessment of all findings and how they relate (or do not relate) to the requirements of this role…"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #8d8d8d', borderRadius: 2, fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: 6 }}>
            Digital Signature <span style={{ color: '#da1e28' }}>*</span>
          </label>
          <p style={{ fontSize: '0.8125rem', color: '#6f6f6f', marginBottom: 6 }}>
            Type your full legal name to serve as your digital signature on this adjudication record.
          </p>
          <input
            type="text"
            name="digital_signature"
            required
            placeholder="Your full legal name"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #8d8d8d', borderRadius: 2, fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <div style={{ backgroundColor: '#fff1f1', border: '1px solid #fa4d56', borderRadius: 2, padding: '10px 14px', marginBottom: '1rem', color: '#da1e28', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !humanRightsConfirmed}
          style={{
            backgroundColor: humanRightsConfirmed ? '#0f62fe' : '#c6c6c6',
            color: '#fff',
            border: 'none',
            borderRadius: 2,
            padding: '12px 32px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: humanRightsConfirmed ? 'pointer' : 'not-allowed',
          }}
        >
          {isPending ? 'Recording…' : 'Record Adjudication'}
        </button>
      </form>
    </div>
  )
}
