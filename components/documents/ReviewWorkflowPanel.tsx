'use client'

import { useState, useTransition } from 'react'
import {
  Button,
  Tag,
  TextArea,
  InlineNotification,
} from '@carbon/react'

interface ReviewStep {
  id: string
  stepId: string
  stepName: string
  stepType: 'reviewer' | 'approver' | 'notified'
  orderIndex: number
  decision: 'pending' | 'approved' | 'rejected' | 'noted' | null
  decidedAt: string | null
  decisionNotes: string | null
  reviewerName: string | null
  assignedRoleName: string | null
}

interface ReviewWorkflowPanelProps {
  documentId: string
  versionId: string | null
  steps: ReviewStep[]
  documentStatus: string
  isOwner: boolean
  currentUserId: string
  currentUserRoleIds: string[]
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function stepTypeTag(stepType: ReviewStep['stepType']) {
  const map: Record<ReviewStep['stepType'], { type: 'blue' | 'teal' | 'gray'; label: string }> = {
    reviewer: { type: 'blue', label: 'Reviewer' },
    approver: { type: 'teal', label: 'Approver' },
    notified: { type: 'gray', label: 'Notified' },
  }
  const cfg = map[stepType]
  return <Tag type={cfg.type} size="sm">{cfg.label}</Tag>
}

function decisionTag(decision: ReviewStep['decision']) {
  if (!decision || decision === 'pending') return <Tag type="gray" size="sm">Pending</Tag>
  if (decision === 'approved') return <Tag type="green" size="sm">Approved</Tag>
  if (decision === 'rejected') return <Tag type="red" size="sm">Rejected</Tag>
  return <Tag type="gray" size="sm">{decision}</Tag>
}

export function ReviewWorkflowPanel({
  documentId,
  versionId,
  steps,
  documentStatus,
  isOwner,
  currentUserId,
  currentUserRoleIds,
}: ReviewWorkflowPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [rejectingStepId, setRejectingStepId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

  const completedCount = steps.filter(
    (s) => s.decision && s.decision !== 'pending'
  ).length
  const totalCount = steps.length

  function canActOnStep(step: ReviewStep): boolean {
    if (step.decision && step.decision !== 'pending') return false
    if (step.stepId === currentUserId) return true
    if (step.assignedRoleName && currentUserRoleIds.includes(step.assignedRoleName)) return true
    return false
  }

  function handleSubmitForReview() {
    setError(null)
    startTransition(async () => {
      const { submitForReview } = await import('@/app/actions/documents')
      const result = await submitForReview(documentId)
      if (result?.error) setError(result.error)
    })
  }

  function handleApprove(stepId: string) {
    setError(null)
    startTransition(async () => {
      const { approveDocumentReview } = await import('@/app/actions/documents')
      const fd = new FormData()
      fd.set('step_id', stepId)
      fd.set('document_id', documentId)
      if (versionId) fd.set('version_id', versionId)
      const result = await approveDocumentReview(fd)
      if (result?.error) setError(result.error)
    })
  }

  function handleRejectConfirm(stepId: string) {
    setError(null)
    startTransition(async () => {
      const { rejectDocumentReview } = await import('@/app/actions/documents')
      const fd = new FormData()
      fd.set('step_id', stepId)
      fd.set('document_id', documentId)
      if (versionId) fd.set('version_id', versionId)
      if (rejectNotes.trim()) fd.set('decision_notes', rejectNotes.trim())
      const result = await rejectDocumentReview(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setRejectingStepId(null)
        setRejectNotes('')
      }
    })
  }

  const sortedSteps = [...steps].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', margin: 0 }}>
            Review Workflow
          </h2>
          {totalCount > 0 && (
            <p style={{ fontSize: '0.75rem', color: '#525252', margin: '0.25rem 0 0' }}>
              Step {completedCount} of {totalCount}
            </p>
          )}
        </div>
        {documentStatus === 'draft' && isOwner && (
          <Button
            kind="primary"
            size="sm"
            onClick={handleSubmitForReview}
            disabled={isPending}
          >
            Submit for Review
          </Button>
        )}
      </div>

      {/* Error notification */}
      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
          style={{ marginBottom: '1rem', maxWidth: '100%' }}
        />
      )}

      {/* Steps list */}
      {sortedSteps.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: '#6f6f6f', textAlign: 'center', padding: '1.5rem 0' }}>
          No workflow steps defined
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sortedSteps.map((step, idx) => {
            const isRejecting = rejectingStepId === step.id
            const userCanAct = canActOnStep(step)

            return (
              <div
                key={step.id}
                style={{
                  border: '1px solid #e0e0e0',
                  padding: '1rem',
                  background: '#ffffff',
                }}
              >
                {/* Step header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  {/* Sequence badge */}
                  <div
                    style={{
                      minWidth: '1.5rem',
                      height: '1.5rem',
                      borderRadius: '50%',
                      background: '#e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#161616',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <span
                        style={{ fontSize: '0.875rem', fontWeight: 500, color: '#161616' }}
                      >
                        {step.stepName}
                      </span>
                      {stepTypeTag(step.stepType)}
                      {decisionTag(step.decision)}
                    </div>

                    {step.reviewerName && (
                      <p style={{ fontSize: '0.75rem', color: '#525252', margin: '0.125rem 0 0' }}>
                        {step.reviewerName}
                      </p>
                    )}
                    {step.assignedRoleName && !step.reviewerName && (
                      <p style={{ fontSize: '0.75rem', color: '#525252', margin: '0.125rem 0 0' }}>
                        Role: {step.assignedRoleName}
                      </p>
                    )}

                    {(step.decision === 'approved' || step.decision === 'rejected') && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.75rem', color: '#525252', margin: 0 }}>
                          {step.decidedAt ? formatDate(step.decidedAt) : ''}
                          {step.decisionNotes ? ` — ${step.decisionNotes}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons for pending steps the current user can act on */}
                {userCanAct && !isRejecting && (
                  <div
                    style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e0e0e0' }}
                  >
                    <Button
                      kind="primary"
                      size="sm"
                      onClick={() => handleApprove(step.id)}
                      disabled={isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      onClick={() => {
                        setRejectingStepId(step.id)
                        setRejectNotes('')
                      }}
                      disabled={isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {/* Reject inline notes form */}
                {isRejecting && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #e0e0e0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <TextArea
                      id={`reject_notes_${step.id}`}
                      labelText="Rejection reason (optional)"
                      placeholder="Describe why you are rejecting this step…"
                      rows={3}
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        kind="danger"
                        size="sm"
                        onClick={() => handleRejectConfirm(step.id)}
                        disabled={isPending}
                      >
                        Confirm Rejection
                      </Button>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => {
                          setRejectingStepId(null)
                          setRejectNotes('')
                        }}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
