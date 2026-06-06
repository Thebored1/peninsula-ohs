'use client'

import { useState, useTransition } from 'react'
import { Tile, TextArea, Button, InlineNotification } from '@carbon/react'
import { updateHazardStatus, promoteToRisk } from '@/app/actions/hazards'
import { useRouter } from 'next/navigation'

interface HazardReviewFormProps {
  reportId: string
  currentStatus: string
}

export default function HazardReviewForm({ reportId, currentStatus }: HazardReviewFormProps) {
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleAction(status: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateHazardStatus(reportId, status, notes || undefined)
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  async function handlePromote() {
    setError(null)
    startTransition(async () => {
      const result = await promoteToRisk(reportId)
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <Tile style={{ padding: 0 }}>
      <div
        style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
          Review
        </h2>
      </div>
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            hideCloseButton
          />
        )}

        <TextArea
          id={`review-notes-${reportId}`}
          labelText="Review Notes"
          placeholder="Add notes about this hazard report…"
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          rows={4}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {currentStatus === 'submitted' && (
            <Button
              kind="secondary"
              size="md"
              disabled={isPending}
              onClick={() => handleAction('under_review')}
              style={{ width: '100%', maxWidth: '100%' }}
            >
              Mark Under Review
            </Button>
          )}

          <Button
            kind="primary"
            size="md"
            disabled={isPending}
            onClick={() => handleAction('actioned')}
            style={{ width: '100%', maxWidth: '100%' }}
          >
            Action
          </Button>

          <Button
            kind="tertiary"
            size="md"
            disabled={isPending}
            onClick={() => handlePromote()}
            style={{ width: '100%', maxWidth: '100%' }}
          >
            Promote to Risk
          </Button>

          <Button
            kind="ghost"
            size="md"
            disabled={isPending}
            onClick={() => handleAction('closed')}
            style={{ width: '100%', maxWidth: '100%' }}
          >
            Close
          </Button>

          <Button
            kind="danger--ghost"
            size="md"
            disabled={isPending}
            onClick={() => handleAction('rejected')}
            style={{ width: '100%', maxWidth: '100%' }}
          >
            Reject
          </Button>
        </div>
      </div>
    </Tile>
  )
}
