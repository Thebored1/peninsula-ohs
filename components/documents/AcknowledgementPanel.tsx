'use client'

import { useState, useTransition } from 'react'
import {
  Button,
  Tag,
  Select,
  SelectItem,
  NumberInput,
  InlineNotification,
} from '@carbon/react'
import { SignatureCapture } from './SignatureCapture'

interface Acknowledgement {
  id: string
  userId: string
  userName: string
  acknowledgedAt: string
  method: string
  signerName: string | null
  signatureImageUrl: string | null
}

interface AcknowledgementRequirement {
  id: string
  type: 'user' | 'role' | 'site'
  label: string
  value: string
  deadlineDays: number | null
}

interface AcknowledgementPanelProps {
  documentId: string
  versionId: string | null
  acknowledgements: Acknowledgement[]
  requirements: AcknowledgementRequirement[]
  signatureMethod: 'draw' | 'type' | 'either'
  currentUserId: string
  isOwner: boolean
  roles: Array<{ id: string; name: string }>
  users: Array<{ id: string; first_name: string; last_name: string }>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function methodTag(method: string) {
  return (
    <Tag type="blue" size="sm" style={{ textTransform: 'capitalize' }}>
      {method.replace(/_/g, ' ')}
    </Tag>
  )
}

export function AcknowledgementPanel({
  documentId,
  versionId,
  acknowledgements,
  requirements,
  signatureMethod,
  currentUserId,
  isOwner,
  roles,
  users,
}: AcknowledgementPanelProps) {
  const [showSignature, setShowSignature] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  // Add requirement form state
  const [addType, setAddType] = useState<'user' | 'role' | 'site'>('user')
  const [addValue, setAddValue] = useState('')
  const [addDeadlineDays, setAddDeadlineDays] = useState<number | ''>('')

  // Determine progress
  const acknowledgedUserIds = new Set(acknowledgements.map((a) => a.userId))
  const total = requirements.length
  const completed = requirements.filter((req) => {
    if (req.type === 'user') return acknowledgedUserIds.has(req.value)
    return false
  }).length
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  // Determine if current user has a user-level requirement and hasn't acknowledged
  const userRequirement = requirements.find(
    (r) => r.type === 'user' && r.value === currentUserId
  )
  const currentUserHasAcked = acknowledgedUserIds.has(currentUserId)
  const showSignButton = !!userRequirement && !currentUserHasAcked && !showSignature

  // Pending requirements: those not yet acknowledged (user type only — roles/sites shown as-is)
  const pendingRequirements = requirements.filter((req) => {
    if (req.type === 'user') return !acknowledgedUserIds.has(req.value)
    return true
  })

  function handleRemoveRequirement(requirementId: string) {
    setError(null)
    startTransition(async () => {
      const { removeAcknowledgementRequirement } = await import('@/app/actions/documents')
      const fd = new FormData()
      fd.set('requirement_id', requirementId)
      fd.set('document_id', documentId)
      const result = await removeAcknowledgementRequirement(fd)
      if (result?.error) setError(result.error)
    })
  }

  function handleAddRequirement() {
    if (!addValue) { setAddError('Please select a value.'); return }
    setAddError(null)
    startTransition(async () => {
      const { addAcknowledgementRequirement } = await import('@/app/actions/documents')
      const fd = new FormData()
      fd.set('document_id', documentId)
      if (versionId) fd.set('version_id', versionId)
      fd.set('type', addType)
      fd.set('value', addValue)
      if (addDeadlineDays !== '') fd.set('deadline_days', String(addDeadlineDays))
      const result = await addAcknowledgementRequirement(fd)
      if (result?.error) {
        setAddError(result.error)
      } else {
        setAddValue('')
        setAddDeadlineDays('')
      }
    })
  }

  const selectOptions = addType === 'user'
    ? users.map((u) => ({ id: u.id, label: `${u.first_name} ${u.last_name}` }))
    : addType === 'role'
    ? roles.map((r) => ({ id: r.id, label: r.name }))
    : []

  return (
    <div>
      <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
        Acknowledgements
      </h2>

      {/* Progress bar */}
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.375rem' }}>
          {completed} of {total} required{total === 1 ? ' signatory has' : ' signatories have'} acknowledged
        </p>
        <div
          style={{
            height: '6px',
            background: '#e0e0e0',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: '#24a148',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
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

      {/* Sign button */}
      {showSignButton && (
        <div style={{ marginBottom: '1.25rem' }}>
          <Button kind="primary" onClick={() => setShowSignature(true)}>
            Sign this Document
          </Button>
        </div>
      )}

      {/* Inline signature capture */}
      {showSignature && (
        <div style={{ marginBottom: '1.25rem' }}>
          <SignatureCapture
            documentId={documentId}
            versionId={versionId}
            signatureMethod={signatureMethod}
            onComplete={() => setShowSignature(false)}
          />
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Left — Acknowledged */}
        <div>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.75rem' }}>
            Acknowledged
          </h3>
          {acknowledgements.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>None yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {acknowledgements.map((ack) => (
                <div
                  key={ack.id}
                  style={{
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #e0e0e0',
                    background: '#f4f4f4',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#161616', fontWeight: 500 }}>
                      {ack.userName}
                    </span>
                    {methodTag(ack.method)}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#525252', margin: 0 }}>
                    {formatDate(ack.acknowledgedAt)}
                    {ack.signerName ? ` — ${ack.signerName}` : ''}
                  </p>
                  {ack.signatureImageUrl && (
                    <img
                      src={ack.signatureImageUrl}
                      alt="Signature"
                      style={{
                        marginTop: '0.375rem',
                        width: '60px',
                        height: '30px',
                        objectFit: 'contain',
                        border: '1px solid #e0e0e0',
                        background: '#ffffff',
                        display: 'block',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Pending */}
        <div>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.75rem' }}>
            Pending
          </h3>
          {pendingRequirements.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>All signatories have acknowledged</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pendingRequirements.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #e0e0e0',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', color: '#161616', flex: 1 }}>
                    {req.label}
                  </span>
                  <Tag
                    type={req.type === 'user' ? 'gray' : req.type === 'role' ? 'blue' : 'teal'}
                    size="sm"
                    style={{ textTransform: 'capitalize' }}
                  >
                    {req.type}
                  </Tag>
                  {req.deadlineDays !== null && (
                    <span style={{ fontSize: '0.75rem', color: '#525252' }}>
                      {req.deadlineDays}d deadline
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manage Required Signatories — owner only */}
      {isOwner && (
        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1.25rem' }}>
          <button
            onClick={() => setShowManage((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#0f62fe',
              padding: 0,
              marginBottom: showManage ? '1rem' : 0,
            }}
          >
            {showManage ? 'Hide' : 'Manage Required Signatories'}
          </button>

          {showManage && (
            <div>
              {/* Current requirements list */}
              {requirements.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.625rem' }}>
                    Current Requirements
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {requirements.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #e0e0e0',
                          background: '#f4f4f4',
                        }}
                      >
                        <Tag
                          type={req.type === 'user' ? 'gray' : req.type === 'role' ? 'blue' : 'teal'}
                          size="sm"
                          style={{ textTransform: 'capitalize' }}
                        >
                          {req.type}
                        </Tag>
                        <span style={{ fontSize: '0.875rem', color: '#161616', flex: 1 }}>{req.label}</span>
                        {req.deadlineDays !== null && (
                          <span style={{ fontSize: '0.75rem', color: '#525252' }}>{req.deadlineDays}d</span>
                        )}
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => handleRemoveRequirement(req.id)}
                          disabled={isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add requirement form */}
              <div style={{ border: '1px solid #e0e0e0', padding: '1rem', background: '#ffffff' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.875rem' }}>
                  Add Requirement
                </h4>

                {addError && (
                  <InlineNotification
                    kind="error"
                    title="Error"
                    subtitle={addError}
                    onCloseButtonClick={() => setAddError(null)}
                    style={{ marginBottom: '0.875rem', maxWidth: '100%' }}
                  />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <Select
                    id="add_req_type"
                    labelText="Type"
                    value={addType}
                    onChange={(e) => {
                      setAddType(e.target.value as 'user' | 'role' | 'site')
                      setAddValue('')
                    }}
                  >
                    <SelectItem value="user" text="User" />
                    <SelectItem value="role" text="Role" />
                    <SelectItem value="site" text="Site" />
                  </Select>

                  {(addType === 'user' || addType === 'role') && (
                    <Select
                      id="add_req_value"
                      labelText={addType === 'user' ? 'User' : 'Role'}
                      value={addValue}
                      onChange={(e) => setAddValue(e.target.value)}
                    >
                      <SelectItem value="" text={`Select ${addType}…`} />
                      {selectOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} text={opt.label} />
                      ))}
                    </Select>
                  )}

                  {addType === 'site' && (
                    <div>
                      <label
                        htmlFor="add_req_site_value"
                        style={{ fontSize: '0.75rem', color: '#525252', display: 'block', marginBottom: '0.25rem' }}
                      >
                        Site ID
                      </label>
                      <input
                        id="add_req_site_value"
                        type="text"
                        placeholder="Enter site UUID"
                        value={addValue}
                        onChange={(e) => setAddValue(e.target.value)}
                        style={{
                          width: '100%',
                          height: '2.5rem',
                          padding: '0 1rem',
                          border: '1px solid #8d8d8d',
                          fontSize: '0.875rem',
                          color: '#161616',
                          background: '#ffffff',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}

                  <NumberInput
                    id="add_req_deadline"
                    label="Deadline (days, optional)"
                    min={1}
                    value={addDeadlineDays === '' ? undefined : addDeadlineDays}
                    onChange={(_e, { value }: { value: number | string; direction: string }) => {
                      const parsed = typeof value === 'string' ? parseInt(value, 10) : value
                      setAddDeadlineDays(isNaN(parsed) ? '' : parsed)
                    }}
                    allowEmpty
                  />

                  <div>
                    <Button
                      kind="primary"
                      size="sm"
                      onClick={handleAddRequirement}
                      disabled={isPending || !addValue}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
