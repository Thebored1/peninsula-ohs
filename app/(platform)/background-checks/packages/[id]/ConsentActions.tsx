'use client'

import { useState, useTransition } from 'react'
import { resendConsentEmail } from '@/app/actions/background-checks'

export default function ConsentActions({ packageId }: { packageId: string }) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleResend() {
    setError(null)
    startTransition(async () => {
      const result = await resendConsentEmail(packageId)
      if (result.error) {
        setError(result.error)
      } else {
        setSent(true)
      }
    })
  }

  if (sent) return <p style={{ fontSize: '0.8125rem', color: '#24a148' }}>✓ Consent email resent</p>

  return (
    <div>
      {error && <p style={{ fontSize: '0.8125rem', color: '#da1e28', marginBottom: 8 }}>{error}</p>}
      <button
        onClick={handleResend}
        disabled={isPending}
        style={{
          backgroundColor: 'transparent',
          border: '1px solid #0f62fe',
          color: '#0f62fe',
          padding: '6px 16px',
          borderRadius: 2,
          fontSize: '0.875rem',
          cursor: 'pointer',
        }}
      >
        {isPending ? 'Sending…' : 'Resend consent email'}
      </button>
    </div>
  )
}
