'use client'

import { useState, useTransition } from 'react'
import { recordConsent } from '@/app/actions/background-checks'
import type { BgcCheckType } from '@/lib/background-checks/provider'

interface Props {
  token: string
  packageId: string
  candidateName: string
  positionTitle: string
  checkTypes: string[]
  checkTypeLabels: Record<string, string>
  consentHtml: string
  templateVersion: number
}

export default function ConsentForm({
  token,
  packageId,
  candidateName,
  positionTitle,
  checkTypes,
  checkTypeLabels,
  consentHtml,
  templateVersion,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [consented, setConsented] = useState<Record<string, boolean>>({})
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allRequired = checkTypes.every(ct => consented[ct])
  const canSubmit = allRequired && agreed && signature.trim().length > 0

  function toggleConsent(ct: string) {
    setConsented(prev => ({ ...prev, [ct]: !prev[ct] }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const consentedTypes = checkTypes.filter(ct => consented[ct]) as BgcCheckType[]
    startTransition(async () => {
      const result = await recordConsent({
        token,
        consentedCheckTypes: consentedTypes,
        signature: signature.trim(),
        signedIp: '',
        emailCompletedFrom: '',
      })
      if (result.error) {
        setError(result.error)
      } else {
        setDone(true)
      }
    })
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h1 style={{ fontSize: 24, color: '#161616', marginBottom: 12 }}>Consent received</h1>
        <p style={{ color: '#525252', maxWidth: 480, margin: '0 auto' }}>
          Thank you, {candidateName}. Your consent has been recorded. The employer will proceed with
          the background check and will be in touch.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ backgroundColor: '#fff', borderRadius: 4, padding: 32, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#161616', marginBottom: 8 }}>
          Background Check Consent
        </h1>
        <p style={{ color: '#525252', marginBottom: 24 }}>
          {candidateName} &mdash; {positionTitle}
        </p>

        {/* Consent form HTML */}
        <div
          style={{ fontSize: 14, lineHeight: 1.6, color: '#393939', marginBottom: 32 }}
          dangerouslySetInnerHTML={{ __html: consentHtml }}
        />

        {/* Per-check consent checkboxes */}
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          Check types requested
        </h2>
        <p style={{ fontSize: 13, color: '#525252', marginBottom: 16 }}>
          Please tick each check type below to confirm your consent for that specific check.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {checkTypes.map(ct => (
            <label key={ct} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!consented[ct]}
                onChange={() => toggleConsent(ct)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 14, color: '#161616' }}>
                <strong>{checkTypeLabels[ct] ?? ct}</strong>
              </span>
            </label>
          ))}
        </div>

        {/* Overall agreement */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 24 }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 14, color: '#161616' }}>
            I confirm that I have read and understood this consent form and that I voluntarily consent
            to the background checks described above. I understand I may withdraw this consent at any
            time before checks are completed.
          </span>
        </label>

        {/* Digital signature */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#161616', marginBottom: 6 }}>
            Digital Signature <span style={{ color: '#da1e28' }}>*</span>
          </label>
          <p style={{ fontSize: 12, color: '#6f6f6f', marginBottom: 8 }}>
            Type your full legal name to serve as your digital signature.
          </p>
          <input
            type="text"
            value={signature}
            onChange={e => setSignature(e.target.value)}
            placeholder="Your full legal name"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #8d8d8d',
              borderRadius: 2,
              fontSize: 14,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div style={{ backgroundColor: '#fff1f1', border: '1px solid #fa4d56', borderRadius: 2, padding: '10px 14px', marginBottom: 16, color: '#da1e28', fontSize: 14 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || isPending}
          style={{
            backgroundColor: canSubmit ? '#0f62fe' : '#c6c6c6',
            color: '#fff',
            border: 'none',
            borderRadius: 2,
            padding: '12px 32px',
            fontSize: 16,
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            width: '100%',
          }}
        >
          {isPending ? 'Submitting…' : 'Sign and Submit Consent'}
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#6f6f6f', textAlign: 'center' }}>
        This consent is governed by PIPEDA and applicable provincial privacy legislation.
        Your information is transmitted securely and used only for the purpose stated above.
      </p>
    </form>
  )
}
