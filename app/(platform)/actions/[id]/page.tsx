import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Tile,
  Tag,
  Breadcrumb,
  BreadcrumbItem,
  Grid,
  Column,
  Button,
} from '@carbon/react'
import { completeAction, updateActionStatus, verifyAction } from '@/app/actions/action-items'
import AddCommentForm from './AddCommentForm'

type TagType =
  | 'gray'
  | 'blue'
  | 'teal'
  | 'purple'
  | 'cyan'
  | 'magenta'
  | 'red'
  | 'green'
  | 'cool-gray'
  | 'warm-gray'
  | 'high-contrast'

function statusTagType(status: string): TagType {
  const map: Record<string, TagType> = {
    open: 'blue',
    in_progress: 'blue',
    completed: 'green',
    verification_pending: 'cyan',
    verified: 'teal',
    closed: 'gray',
    overdue: 'red',
    reopened: 'blue',
    cancelled: 'gray',
  }
  return map[status] ?? 'gray'
}

function actionTypeTagType(type: string): TagType {
  const map: Record<string, TagType> = {
    corrective: 'blue',
    preventive: 'teal',
    immediate: 'red',
    long_term: 'gray',
  }
  return map[type] ?? 'gray'
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: '#24a148' },
  medium: { label: 'Medium', color: '#f1c21b' },
  high: { label: 'High', color: '#f97316' },
  critical: { label: 'Critical', color: '#da1e28' },
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isOverdue(dueDate: string | null, extendedDueDate: string | null, status: string) {
  if (!dueDate) return false
  const terminalStatuses = ['closed', 'completed', 'verified', 'cancelled']
  if (terminalStatuses.includes(status)) return false
  const effectiveDue = extendedDueDate ?? dueDate
  return new Date(effectiveDue) < new Date(new Date().toDateString())
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <p
        style={{
          fontSize: '0.75rem',
          color: '#6f6f6f',
          letterSpacing: '0.32px',
          marginBottom: '0.25rem',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

export default async function ActionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: action, error } = await supabase
    .from('actions')
    .select(`
      id,
      action_number,
      title,
      description,
      action_type,
      priority,
      status,
      source_type,
      source_reference,
      due_date,
      extended_due_date,
      verification_required,
      completion_notes,
      completed_at,
      completed_by,
      verified_at,
      verified_by,
      verification_notes,
      rejection_reason,
      assigned_at,
      created_at,
      assigned_profile:user_profiles!assigned_to(first_name, last_name, email),
      assigner_profile:user_profiles!assigned_by(first_name, last_name),
      completer_profile:user_profiles!completed_by(first_name, last_name),
      verifier_profile:user_profiles!verified_by(first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (error || !action) notFound()

  const { data: comments } = await supabase
    .from('action_comments')
    .select(`
      id,
      body,
      comment_type,
      created_at,
      commenter:user_profiles!user_id(first_name, last_name, email)
    `)
    .eq('action_id', id)
    .order('created_at', { ascending: true })

  const a = action as typeof action & {
    assigned_profile: { first_name: string; last_name: string; email: string } | null
    assigner_profile: { first_name: string; last_name: string } | null
    completer_profile: { first_name: string; last_name: string } | null
    verifier_profile: { first_name: string; last_name: string } | null
  }

  const pc = priorityConfig[a.priority] ?? { label: a.priority, color: '#525252' }
  const overdue = isOverdue(a.due_date, a.extended_due_date, a.status)
  const effectiveDue = a.extended_due_date ?? a.due_date

  const terminalStatuses = ['closed', 'cancelled']
  const canCancel = !terminalStatuses.includes(a.status)
  const canMarkInProgress = ['open', 'reopened'].includes(a.status)
  const canComplete = ['open', 'in_progress', 'reopened'].includes(a.status)
  const canVerify = a.status === 'verification_pending'

  const showCompletionSection = ['completed', 'verification_pending', 'verified', 'closed'].includes(
    a.status,
  )
  const showVerificationSection = a.status === 'verified' || a.status === 'closed'

  return (
    <div style={{ padding: '2rem' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/actions">Actions</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{a.action_number ?? a.id.slice(0, 8)}</BreadcrumbItem>
      </Breadcrumb>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#6f6f6f',
              letterSpacing: '0.32px',
            }}
          >
            {a.action_number ?? '—'}
          </span>
          {/* Priority pill */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.25rem 0.625rem',
              borderRadius: '1rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: pc.color,
              border: `1px solid ${pc.color}`,
              backgroundColor: 'transparent',
            }}
          >
            <span
              style={{
                width: '0.4375rem',
                height: '0.4375rem',
                borderRadius: '50%',
                backgroundColor: pc.color,
              }}
            />
            {pc.label} Priority
          </span>
          <Tag type={statusTagType(a.status)} size="sm">
            {a.status.replace(/_/g, ' ')}
          </Tag>
          <Tag type={actionTypeTagType(a.action_type)} size="sm">
            {a.action_type.replace(/_/g, ' ')}
          </Tag>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>{a.title}</h1>
          <a href={`/actions/${id}/edit`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none', whiteSpace: 'nowrap', marginTop: '0.5rem' }}>
            Edit
          </a>
        </div>
      </div>

      <Grid condensed>
        {/* Left column: details */}
        <Column sm={4} md={5} lg={10}>
          {/* Source reference */}
          {a.source_type && a.source_type !== 'standalone' && (
            <Tile
              style={{
                padding: '1rem 1.5rem',
                marginBottom: '1rem',
                backgroundColor: '#edf5ff',
                borderLeft: '3px solid #0f62fe',
              }}
            >
              <p style={{ fontSize: '0.875rem', color: '#161616' }}>
                <span style={{ fontWeight: 600 }}>Linked to {a.source_type}: </span>
                {a.source_reference ?? '—'}
              </p>
            </Tile>
          )}

          {/* Details grid */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Type">{a.action_type.replace(/_/g, ' ')}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Priority">
                    <span style={{ color: pc.color, fontWeight: 600 }}>{pc.label}</span>
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Assigned To">
                    {a.assigned_profile
                      ? `${a.assigned_profile.first_name} ${a.assigned_profile.last_name}`
                      : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Assigned By">
                    {a.assigner_profile
                      ? `${a.assigner_profile.first_name} ${a.assigner_profile.last_name}`
                      : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Due Date">
                    <span style={{ color: overdue ? '#da1e28' : '#161616', fontWeight: overdue ? 600 : 400 }}>
                      {formatDate(effectiveDue)}
                      {overdue && ' (Overdue)'}
                    </span>
                  </DetailRow>
                </Column>
                {a.extended_due_date && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Extended Due Date">{formatDate(a.extended_due_date)}</DetailRow>
                  </Column>
                )}
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Verification Required">
                    {a.verification_required ? 'Yes' : 'No'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Created">{formatDate(a.created_at)}</DetailRow>
                </Column>
              </Grid>
            </div>
          </Tile>

          {/* Description */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Description
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {a.description}
              </p>
            </div>
          </Tile>

          {/* Completion section */}
          {showCompletionSection && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Completion
                </h2>
                <Tag type="green" size="sm">Completed</Tag>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Completed By">
                      {a.completer_profile
                        ? `${a.completer_profile.first_name} ${a.completer_profile.last_name}`
                        : '—'}
                    </DetailRow>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Completed At">{formatDateTime(a.completed_at)}</DetailRow>
                  </Column>
                </Grid>
                {a.completion_notes && (
                  <DetailRow label="Completion Notes">
                    <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.completion_notes}</p>
                  </DetailRow>
                )}
              </div>
            </Tile>
          )}

          {/* Verification section */}
          {showVerificationSection && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Verification
                </h2>
                <Tag type="teal" size="sm">Verified</Tag>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Verified By">
                      {a.verifier_profile
                        ? `${a.verifier_profile.first_name} ${a.verifier_profile.last_name}`
                        : '—'}
                    </DetailRow>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Verified At">{formatDateTime(a.verified_at)}</DetailRow>
                  </Column>
                </Grid>
                {a.verification_notes && (
                  <DetailRow label="Verification Notes">
                    <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.verification_notes}</p>
                  </DetailRow>
                )}
              </div>
            </Tile>
          )}

          {/* Comments */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Comments
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#6f6f6f',
                }}
              >
                {(comments ?? []).length} {(comments ?? []).length === 1 ? 'comment' : 'comments'}
              </span>
            </div>
            <div>
              {(comments ?? []).length === 0 ? (
                <div
                  style={{
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    color: '#6f6f6f',
                    fontSize: '0.875rem',
                  }}
                >
                  No comments yet. Be the first to add a note.
                </div>
              ) : (
                (comments ?? []).map((comment, i) => {
                  const c = comment as typeof comment & {
                    commenter: { first_name: string; last_name: string; email: string } | null
                  }
                  const authorName = c.commenter
                    ? `${c.commenter.first_name} ${c.commenter.last_name}`
                    : 'Unknown user'
                  const authorEmail = c.commenter?.email ?? ''

                  return (
                    <div
                      key={c.id}
                      style={{
                        padding: '1rem 1.5rem',
                        borderBottom:
                          i < (comments ?? []).length - 1 ? '1px solid #e0e0e0' : 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                            {authorName}
                          </span>
                          {authorEmail && (
                            <span style={{ fontSize: '0.75rem', color: '#6f6f6f', marginLeft: '0.5rem' }}>
                              {authorEmail}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#6f6f6f', whiteSpace: 'nowrap' }}>
                          {formatDateTime(c.created_at)}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {c.body}
                      </p>
                    </div>
                  )
                })
              )}

              {/* Add comment form */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e0e0e0' }}>
                <AddCommentForm actionId={id} />
              </div>
            </div>
          </Tile>
        </Column>

        {/* Right column: action buttons */}
        <Column sm={4} md={3} lg={6}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Actions</h2>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {canMarkInProgress && (
                <form
                  action={async () => {
                    'use server'
                    await updateActionStatus(id, 'in_progress')
                  }}
                >
                  <Button kind="secondary" size="md" style={{ width: '100%' }} type="submit">
                    Mark In Progress
                  </Button>
                </form>
              )}

              {canComplete && (
                <form
                  action={async (fd: FormData) => {
                    'use server'
                    const notes = fd.get('notes') as string ?? ''
                    await completeAction(id, notes)
                  }}
                >
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label
                      htmlFor="complete-notes"
                      style={{ fontSize: '0.75rem', color: '#525252', display: 'block', marginBottom: '0.25rem' }}
                    >
                      Completion notes (optional)
                    </label>
                    <textarea
                      id="complete-notes"
                      name="notes"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #c6c6c6',
                        borderRadius: '2px',
                        fontSize: '0.875rem',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                      placeholder="Describe what was done..."
                    />
                  </div>
                  <Button kind="primary" size="md" style={{ width: '100%' }} type="submit">
                    Complete Action
                  </Button>
                </form>
              )}

              {canVerify && (
                <form
                  action={async (fd: FormData) => {
                    'use server'
                    const notes = fd.get('notes') as string ?? ''
                    await verifyAction(id, notes)
                  }}
                >
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label
                      htmlFor="verify-notes"
                      style={{ fontSize: '0.75rem', color: '#525252', display: 'block', marginBottom: '0.25rem' }}
                    >
                      Verification notes (optional)
                    </label>
                    <textarea
                      id="verify-notes"
                      name="notes"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #c6c6c6',
                        borderRadius: '2px',
                        fontSize: '0.875rem',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                      placeholder="Describe verification findings..."
                    />
                  </div>
                  <Button kind="primary" size="md" style={{ width: '100%' }} type="submit">
                    Verify Action
                  </Button>
                </form>
              )}

              {canCancel && (
                <form
                  action={async () => {
                    'use server'
                    await updateActionStatus(id, 'cancelled')
                  }}
                >
                  <Button kind="danger--ghost" size="md" style={{ width: '100%' }} type="submit">
                    Cancel Action
                  </Button>
                </form>
              )}

              {!canMarkInProgress && !canComplete && !canVerify && !canCancel && (
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f', textAlign: 'center' }}>
                  No actions available for this status.
                </p>
              )}
            </div>
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
