'use client'

import { useState, useTransition } from 'react'
import { issueAdverseActionPreNotice, issueAdverseActionFinalNotice } from '@/app/actions/background-checks'
import { isDisputeWindowOpen } from '@/lib/background-checks/adverse-action'

interface Props {
  packageId: string
  hasPreNotice: boolean
  hasFinalNotice: boolean
  preNoticeDisputeWindowClosesAt: string | null
}

export default function AdverseActionFlow({ packageId, hasPreNotice, hasFinalNotice, preNoticeDisputeWindowClosesAt }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [preNoticeSent, setPreNoticeSent] = useState(hasPreNotice)
  const [finalNoticeSent, setFinalNoticeSent] = useState(hasFinalNotice)

  const disputeWindowOpen = preNoticeDisputeWindowClosesAt
    ? isDisputeWindowOpen(preNoticeDisputeWindowClosesAt)
    : false

  function handlePreNotice() {
    setError(null)
    startTransition(async () => {
      const result = await issueAdverseActionPreNotice(packageId)
      if (result.error) { setError(result.error); return }
      setPreNoticeSent(true)
    })
  }

  function handleFinalNotice() {
    setError(null)
    startTransition(async () => {
      const result = await issueAdverseActionFinalNotice(packageId)
      if (result.error) { setError(result.error); return }
      setFinalNoticeSent(true)
    })
  }

  return (
    <div style={{ backgroundColor: '#fff1f1', border: '1px solid #fa4d56', borderRadius: 4, padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#da1e28', marginBottom: 8 }}>Adverse Action Process</h2>
      <p style={{ fontSize: '0.8125rem', color: '#393939', marginBottom: '1.5rem' }}>
        One or more results may negatively affect the hiring decision. Canadian law requires you to follow the adverse action process
        before making a final decision. This involves sending a pre-notification, allowing 5 business days for the candidate to dispute,
        then sending a final notice.
      </p>

      {error && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #da1e28', borderRadius: 2, padding: '10px 14px', marginBottom: '1rem', color: '#da1e28', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Step 1: Pre-notice */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: '1rem', padding: '12px 16px', backgroundColor: preNoticeSent ? '#defbe6' : '#fff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <span style={{ fontSize: 20 }}>{preNoticeSent ? '✓' : '1'}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: 2 }}>Send Pre-Notification</p>
          <p style={{ fontSize: '0.8125rem', color: '#525252' }}>
            Inform the candidate of the potential adverse action, provide a copy of the report,
            and open a 5-business-day dispute window.
          </p>
        </div>
        {!preNoticeSent && (
          <button
            onClick={handlePreNotice}
            disabled={isPending}
            style={{ backgroundColor: '#da1e28', color: '#fff', border: 'none', borderRadius: 2, padding: '8px 16px', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {isPending ? 'Sending…' : 'Send Pre-Notice'}
          </button>
        )}
        {preNoticeSent && preNoticeDisputeWindowClosesAt && (
          <span style={{ fontSize: '0.8125rem', color: '#525252', whiteSpace: 'nowrap' }}>
            Dispute window {disputeWindowOpen ? 'closes' : 'closed'}{' '}
            {new Date(preNoticeDisputeWindowClosesAt).toLocaleDateString('en-CA')}
          </span>
        )}
      </div>

      {/* Step 2: Wait */}
      {preNoticeSent && disputeWindowOpen && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fdf6dd', borderRadius: 2, border: '1px solid #f1c21b', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#393939' }}>
            <strong>Dispute window open.</strong> The candidate has until{' '}
            {new Date(preNoticeDisputeWindowClosesAt!).toLocaleDateString('en-CA', { weekday: 'long', day: 'numeric', month: 'long' })}{' '}
            to submit a dispute. You cannot issue a final notice until this window closes.
          </p>
        </div>
      )}

      {/* Step 3: Final notice */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', backgroundColor: finalNoticeSent ? '#defbe6' : '#fff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <span style={{ fontSize: 20 }}>{finalNoticeSent ? '✓' : '2'}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: 2 }}>Send Final Notice</p>
          <p style={{ fontSize: '0.8125rem', color: '#525252' }}>
            After the dispute window closes (and any dispute is resolved), send the final adverse action notice to the candidate.
          </p>
        </div>
        {!finalNoticeSent && preNoticeSent && !disputeWindowOpen && (
          <button
            onClick={handleFinalNotice}
            disabled={isPending}
            style={{ backgroundColor: '#da1e28', color: '#fff', border: 'none', borderRadius: 2, padding: '8px 16px', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {isPending ? 'Sending…' : 'Send Final Notice'}
          </button>
        )}
        {!preNoticeSent && (
          <span style={{ fontSize: '0.8125rem', color: '#8d8d8d' }}>Send pre-notice first</span>
        )}
        {preNoticeSent && disputeWindowOpen && (
          <span style={{ fontSize: '0.8125rem', color: '#8d8d8d' }}>Waiting for dispute window</span>
        )}
      </div>
    </div>
  )
}
