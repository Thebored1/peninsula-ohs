import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem,
  Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer,
} from '@carbon/react'
import { ReviewWorkflowPanel } from '@/components/documents/ReviewWorkflowPanel'
import { AcknowledgementPanel } from '@/components/documents/AcknowledgementPanel'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{label}</p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps { params: Promise<{ id: string }> }

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: doc } = await supabase
    .from('documents')
    .select(`
      id, document_number, title, description, version, version_number,
      review_due_date, expiry_date, created_at,
      file_url, file_name, file_size_bytes, file_mime_type,
      requires_acknowledgement, owner_id, review_workflow_id,
      document_types!document_type_id(name),
      document_statuses!status_id(name, colour_code, is_live, code)
    `)
    .eq('id', id)
    .single()

  if (!doc) notFound()

  // Fetch owner name if present
  let ownerName: string | null = null
  if (doc.owner_id) {
    const { data: ownerProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', doc.owner_id)
      .single()
    if (ownerProfile) ownerName = `${ownerProfile.first_name} ${ownerProfile.last_name}`
  }

  const { data: versions } = await supabase
    .from('document_versions')
    .select('id, version_number, created_at, change_summary')
    .eq('document_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Latest version id for acknowledgements
  const latestVersionId = versions && versions.length > 0 ? versions[0].id : null

  // Review workflow data
  let reviewSteps: {
    id: string; stepId: string; stepName: string; stepType: 'reviewer' | 'approver' | 'notified'
    orderIndex: number; decision: 'pending' | 'approved' | 'rejected' | 'noted' | null; decidedAt: string | null
    decisionNotes: string | null; reviewerName: string | null; assignedRoleName: string | null
  }[] = []

  if (doc.review_workflow_id || latestVersionId) {
    const { data: reviews } = await supabase
      .from('document_version_reviews')
      .select(`
        id, decision, decision_notes, decided_at, reviewer_id,
        document_review_workflow_steps!workflow_step_id(
          id, step_name, step_type, order_index, assigned_role_id,
          roles!assigned_role_id(name)
        )
      `)
      .eq('document_id', id)
      .order('created_at', { ascending: true })

    if (reviews) {
      reviewSteps = reviews.map((r) => {
        const stepRaw = r.document_review_workflow_steps
        const step = Array.isArray(stepRaw) ? stepRaw[0] : stepRaw
        const roleRaw = step?.roles
        const role = Array.isArray(roleRaw) ? roleRaw[0] : roleRaw
        return {
          id: r.id,
          stepId: step?.id ?? '',
          stepName: step?.step_name ?? '',
          stepType: (step?.step_type ?? 'reviewer') as 'reviewer' | 'approver' | 'notified',
          orderIndex: step?.order_index ?? 0,
          decision: (r.decision ?? null) as 'pending' | 'approved' | 'rejected' | 'noted' | null,
          decidedAt: r.decided_at ?? null,
          decisionNotes: r.decision_notes ?? null,
          reviewerName: null,
          assignedRoleName: (role as { name?: string } | null)?.name ?? null,
        }
      }).sort((a, b) => a.orderIndex - b.orderIndex)
    }
  }

  // Acknowledgement data
  let acknowledgements: {
    id: string; userId: string; userName: string; acknowledgedAt: string
    method: string; signerName: string | null; signatureImageUrl: string | null
  }[] = []
  let requirements: {
    id: string; type: 'user' | 'role' | 'site'; label: string; value: string; deadlineDays: number | null
  }[] = []

  if (doc.requires_acknowledgement) {
    const { data: acks } = await supabase
      .from('document_acknowledgements')
      .select('id, user_id, acknowledged_at, method, signer_name, signature_image_url')
      .eq('document_id', id)
      .order('acknowledged_at', { ascending: false })

    if (acks) {
      const userIds = acks.map((a) => a.user_id)
      const { data: ackProfiles } = userIds.length > 0
        ? await supabase.from('user_profiles').select('id, first_name, last_name').in('id', userIds)
        : { data: [] }
      const profileMap = new Map((ackProfiles ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`]))

      acknowledgements = acks.map((a) => ({
        id: a.id,
        userId: a.user_id,
        userName: profileMap.get(a.user_id) ?? 'Unknown',
        acknowledgedAt: a.acknowledged_at,
        method: a.method,
        signerName: a.signer_name ?? null,
        signatureImageUrl: a.signature_image_url ?? null,
      }))
    }

    const { data: reqs } = await supabase
      .from('document_acknowledgement_requirements')
      .select(`
        id, required_user_id, required_role_id, required_site_id, deadline_days,
        user_profiles!required_user_id(first_name, last_name),
        roles!required_role_id(name),
        sites!required_site_id(name)
      `)
      .eq('document_id', id)
      .eq('is_active', true)

    if (reqs) {
      requirements = reqs.map((r) => {
        if (r.required_user_id) {
          const up = Array.isArray(r.user_profiles) ? r.user_profiles[0] : r.user_profiles
          const typedUp = up as { first_name?: string; last_name?: string } | null
          return { id: r.id, type: 'user' as const, label: typedUp ? `${typedUp.first_name} ${typedUp.last_name}` : 'Unknown', value: r.required_user_id, deadlineDays: r.deadline_days }
        }
        if (r.required_role_id) {
          const rl = Array.isArray(r.roles) ? r.roles[0] : r.roles
          return { id: r.id, type: 'role' as const, label: (rl as { name?: string } | null)?.name ?? 'Unknown role', value: r.required_role_id, deadlineDays: r.deadline_days }
        }
        const st = Array.isArray(r.sites) ? r.sites[0] : r.sites
        return { id: r.id, type: 'site' as const, label: (st as { name?: string } | null)?.name ?? 'Unknown site', value: r.required_site_id!, deadlineDays: r.deadline_days }
      })
    }
  }

  // Org signature method + current user roles
  let signatureMethod: 'draw' | 'type' | 'either' = 'either'
  let currentUserRoleIds: string[] = []
  let orgUsers: { id: string; first_name: string; last_name: string }[] = []
  let orgRoles: { id: string; name: string }[] = []

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organisation_id')
      .eq('id', user.id)
      .single()

    if (profile) {
      const [{ data: org }, { data: userRoles }, { data: users }, { data: roles }] = await Promise.all([
        supabase.from('organisations').select('required_signature_method').eq('id', profile.organisation_id).single(),
        supabase.from('user_roles').select('role_id').eq('user_id', user.id),
        supabase.from('user_profiles').select('id, first_name, last_name').eq('organisation_id', profile.organisation_id).eq('is_active', true).order('first_name'),
        supabase.from('roles').select('id, name').eq('organisation_id', profile.organisation_id).order('name'),
      ])
      signatureMethod = ((org as { required_signature_method?: string } | null)?.required_signature_method ?? 'either') as 'draw' | 'type' | 'either'
      currentUserRoleIds = (userRoles ?? []).map((r) => r.role_id)
      orgUsers = users ?? []
      orgRoles = roles ?? []
    }
  }

  const typeRaw = doc.document_types
  const statusRaw = doc.document_statuses
  const type = Array.isArray(typeRaw) ? (typeRaw[0] as { name: string } | undefined) ?? null : (typeRaw as { name: string } | null)
  const status = Array.isArray(statusRaw)
    ? (statusRaw[0] as { name: string; colour_code: string; is_live: boolean; code: string } | undefined) ?? null
    : (statusRaw as { name: string; colour_code: string; is_live: boolean; code: string } | null)

  const displayVersion = doc.version_number ?? doc.version ?? '1.0'
  const isOwner = user ? doc.owner_id === user.id : false

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/documents">Documents</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{doc.document_number ?? doc.title}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {doc.document_number && (
            <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
              {doc.document_number}
            </p>
          )}
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>{doc.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {status && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: status.colour_code }} />
                <Tag type={status.is_live ? 'green' : 'gray'} size="md">{status.name}</Tag>
              </div>
            )}
            <Tag type="blue" size="md">v{displayVersion}</Tag>
            {doc.requires_acknowledgement && (
              <Tag type="purple" size="md">Requires Acknowledgement</Tag>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          {doc.file_url && (
            <a
              href={doc.file_url}
              target="_blank"
              download={doc.file_name ?? true}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                fontSize: '0.875rem', color: '#ffffff', backgroundColor: '#0f62fe',
                padding: '0.5rem 1rem', textDecoration: 'none', borderRadius: '0',
              }}
            >
              Download Document
            </a>
          )}
          <a href={`/documents/${id}/edit`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
            Edit
          </a>
        </div>
      </div>

      <Grid condensed>
        {/* Left column */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}><DetailRow label="Type">{type?.name ?? '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Version">{displayVersion}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Review Due">{formatDate(doc.review_due_date)}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Expiry Date">{formatDate(doc.expiry_date ?? null)}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Created">{formatDate(doc.created_at)}</DetailRow></Column>
                {ownerName && (
                  <Column sm={4} md={4} lg={8}><DetailRow label="Owner">{ownerName}</DetailRow></Column>
                )}
              </Grid>
              {doc.description && (
                <div style={{ marginTop: '0.5rem' }}>
                  <DetailRow label="Description">{doc.description}</DetailRow>
                </div>
              )}
            </div>
          </Tile>

          {doc.file_url && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Attached File</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  {doc.file_name && <Column sm={4} md={4} lg={8}><DetailRow label="File Name">{doc.file_name}</DetailRow></Column>}
                  {doc.file_mime_type && <Column sm={4} md={4} lg={8}><DetailRow label="File Type">{doc.file_mime_type}</DetailRow></Column>}
                  {doc.file_size_bytes && <Column sm={4} md={4} lg={8}><DetailRow label="File Size">{formatFileSize(doc.file_size_bytes)}</DetailRow></Column>}
                </Grid>
                <a href={doc.file_url} target="_blank" download={doc.file_name ?? true}
                  style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none', marginTop: '0.5rem' }}>
                  Download {doc.file_name ?? 'Document'}
                </a>
              </div>
            </Tile>
          )}

          {/* Review Workflow Panel */}
          {(doc.review_workflow_id || reviewSteps.length > 0) && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Review &amp; Approval</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <ReviewWorkflowPanel
                  documentId={id}
                  versionId={latestVersionId}
                  steps={reviewSteps}
                  documentStatus={status?.code ?? 'draft'}
                  isOwner={isOwner}
                  currentUserId={user?.id ?? ''}
                  currentUserRoleIds={currentUserRoleIds}
                />
              </div>
            </Tile>
          )}
        </Column>

        {/* Right column */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Version History</h2>
            </div>
            {!versions || versions.length === 0 ? (
              <div style={{ padding: '1.5rem', fontSize: '0.875rem', color: '#6f6f6f', textAlign: 'center' }}>
                No version history
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Version</TableHeader>
                      <TableHeader>Date</TableHeader>
                      <TableHeader>Changes</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {versions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>{v.version_number ?? '—'}</TableCell>
                        <TableCell>{formatDate(v.created_at)}</TableCell>
                        <TableCell>{v.change_summary ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Tile>

          {/* Acknowledgements Panel */}
          {doc.requires_acknowledgement && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Acknowledgements</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <AcknowledgementPanel
                  documentId={id}
                  versionId={latestVersionId}
                  acknowledgements={acknowledgements}
                  requirements={requirements}
                  signatureMethod={signatureMethod}
                  currentUserId={user?.id ?? ''}
                  isOwner={isOwner}
                  roles={orgRoles}
                  users={orgUsers}
                />
              </div>
            </Tile>
          )}
        </Column>
      </Grid>
    </div>
  )
}
