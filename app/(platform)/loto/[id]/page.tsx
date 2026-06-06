import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Tile,
  Breadcrumb,
  BreadcrumbItem,
  Tag,
  Button,
} from '@carbon/react'
import { updateLotoStatus, createLotoIsolationPoint, createLotoAuthorization, updateLotoAuthorizationStatus } from '@/app/actions/loto'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{
        fontSize: '0.75rem',
        color: '#6f6f6f',
        letterSpacing: '0.32px',
        marginBottom: '0.25rem',
        textTransform: 'uppercase',
      }}>
        {label}
      </p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, { type: 'gray' | 'green' | 'purple'; label: string }> = {
    draft:    { type: 'gray',   label: 'Draft' },
    approved: { type: 'green',  label: 'Approved' },
    archived: { type: 'purple', label: 'Archived' },
  }
  const cfg = map[status] ?? { type: 'gray' as const, label: status }
  return <Tag type={cfg.type} size="md">{cfg.label}</Tag>
}

function AuthStatusTag({ status }: { status: string }) {
  const map: Record<string, { type: 'green' | 'teal' | 'red'; label: string }> = {
    active:    { type: 'green', label: 'Active' },
    completed: { type: 'teal',  label: 'Completed' },
    cancelled: { type: 'red',   label: 'Cancelled' },
  }
  const cfg = map[status] ?? { type: 'green' as const, label: status }
  return <Tag type={cfg.type} size="sm">{cfg.label}</Tag>
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LotoDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: procedure } = await supabase
    .from('loto_procedures')
    .select(`
      id, procedure_number, title, description, asset_description,
      status, revision_number, next_review_date,
      approved_at, created_at, updated_at,
      sites(id, name),
      approved_by_profile:user_profiles!loto_procedures_approved_by_fkey(first_name, last_name),
      created_by_profile:user_profiles!loto_procedures_created_by_fkey(first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (!procedure) notFound()

  const { data: isolationPoints } = await supabase
    .from('loto_isolation_points')
    .select(`
      id, sequence_number, location_description, isolation_method,
      lock_device_type, verification_method, notes,
      loto_energy_types(id, name, colour_code)
    `)
    .eq('procedure_id', id)
    .order('sequence_number', { ascending: true })

  const { data: authorizations } = await supabase
    .from('loto_authorizations')
    .select(`
      id, authorization_number, job_description, status,
      authorized_at, work_start_at, work_end_at, created_at,
      authorized_by_profile:user_profiles!loto_authorizations_authorized_by_fkey(first_name, last_name)
    `)
    .eq('procedure_id', id)
    .order('created_at', { ascending: false })

  const { data: energyTypes } = await supabase
    .from('loto_energy_types')
    .select('id, name, colour_code')
    .order('display_order')

  // Normalise joined relations
  const siteRaw = procedure.sites
  const site = Array.isArray(siteRaw)
    ? (siteRaw[0] as { id: string; name: string } | undefined) ?? null
    : (siteRaw as { id: string; name: string } | null)

  const approvedByRaw = (procedure as Record<string, unknown>).approved_by_profile
  const approvedBy = Array.isArray(approvedByRaw)
    ? (approvedByRaw[0] as { first_name: string; last_name: string } | undefined) ?? null
    : (approvedByRaw as { first_name: string; last_name: string } | null)

  const createdByRaw = (procedure as Record<string, unknown>).created_by_profile
  const createdBy = Array.isArray(createdByRaw)
    ? (createdByRaw[0] as { first_name: string; last_name: string } | undefined) ?? null
    : (createdByRaw as { first_name: string; last_name: string } | null)

  const status = procedure.status as string

  // Server actions bound to this procedure
  async function handleApprove(formData: FormData) {
    'use server'
    await updateLotoStatus(id, 'approved')
  }
  async function handleArchive(formData: FormData) {
    'use server'
    await updateLotoStatus(id, 'archived')
  }
  async function handleReturnToDraft(formData: FormData) {
    'use server'
    await updateLotoStatus(id, 'draft')
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/loto">LOTO Procedures</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          {procedure.procedure_number ?? id.slice(0, 8)}
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            {procedure.procedure_number ?? '—'} &nbsp;&bull;&nbsp; Rev {procedure.revision_number}
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.5rem' }}>
            {procedure.title}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusTag status={status} />
            {site && (
              <span style={{ fontSize: '0.875rem', color: '#525252' }}>{site.name}</span>
            )}
          </div>
        </div>

        {/* Status actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {status === 'draft' && (
            <form action={handleApprove}>
              <Button type="submit" kind="primary" size="md">Approve Procedure</Button>
            </form>
          )}
          {status === 'approved' && (
            <>
              <form action={handleReturnToDraft}>
                <Button type="submit" kind="secondary" size="md">Return to Draft</Button>
              </form>
              <form action={handleArchive}>
                <Button type="submit" kind="danger--ghost" size="md">Archive</Button>
              </form>
            </>
          )}
          {status === 'archived' && (
            <form action={handleReturnToDraft}>
              <Button type="submit" kind="secondary" size="md">Restore to Draft</Button>
            </form>
          )}
        </div>
      </div>

      <Grid condensed>
        {/* Left column */}
        <Column sm={4} md={8} lg={10}>

          {/* Procedure details */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Procedure Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Asset / Equipment">
                    {procedure.asset_description ?? '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Site">{site?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Next Review Date">
                    {formatDate(procedure.next_review_date)}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Created By">
                    {createdBy ? `${createdBy.first_name} ${createdBy.last_name}` : '—'}
                  </DetailRow>
                </Column>
                {approvedBy && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Approved By">
                      {`${approvedBy.first_name} ${approvedBy.last_name}`}
                    </DetailRow>
                  </Column>
                )}
                {procedure.approved_at && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Approved At">
                      {formatDateTime(procedure.approved_at)}
                    </DetailRow>
                  </Column>
                )}
                <Column sm={4} md={8} lg={16}>
                  <DetailRow label="Created">{formatDateTime(procedure.created_at)}</DetailRow>
                </Column>
              </Grid>
            </div>
          </Tile>

          {/* Description */}
          {procedure.description && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Description</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>
                  {procedure.description}
                </p>
              </div>
            </Tile>
          )}

          {/* Isolation Points */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Isolation Points
                {isolationPoints && isolationPoints.length > 0 && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 400, color: '#525252' }}>
                    ({isolationPoints.length} step{isolationPoints.length !== 1 ? 's' : ''})
                  </span>
                )}
              </h2>
            </div>

            {!isolationPoints || isolationPoints.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No isolation points defined. Add the first step below.
              </div>
            ) : (
              <div style={{ padding: '1rem 1.5rem' }}>
                <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {isolationPoints.map((point, idx) => {
                    const etRaw = point.loto_energy_types
                    const et = Array.isArray(etRaw)
                      ? (etRaw[0] as { id: string; name: string; colour_code: string } | undefined) ?? null
                      : (etRaw as { id: string; name: string; colour_code: string } | null)
                    return (
                      <li
                        key={point.id}
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          paddingBottom: '1.25rem',
                          marginBottom: idx < isolationPoints.length - 1 ? '1.25rem' : 0,
                          borderBottom: idx < isolationPoints.length - 1 ? '1px solid #e0e0e0' : 'none',
                        }}
                      >
                        {/* Step number bubble */}
                        <div style={{
                          flexShrink: 0,
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '50%',
                          backgroundColor: et?.colour_code ?? '#6f6f6f',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}>
                          {point.sequence_number}
                        </div>

                        {/* Step content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                              {point.location_description}
                            </span>
                            {et && (
                              <Tag type="gray" size="sm" style={{ backgroundColor: et.colour_code + '22', color: et.colour_code }}>
                                {et.name}
                              </Tag>
                            )}
                          </div>
                          <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '0.25rem' }}>
                            <strong>Method:</strong> {point.isolation_method}
                          </p>
                          {point.lock_device_type && (
                            <p style={{ fontSize: '0.8125rem', color: '#525252', marginBottom: '0.25rem' }}>
                              <strong>Lock/Device:</strong> {point.lock_device_type}
                            </p>
                          )}
                          {point.verification_method && (
                            <p style={{ fontSize: '0.8125rem', color: '#525252', marginBottom: '0.25rem' }}>
                              <strong>Verification:</strong> {point.verification_method}
                            </p>
                          )}
                          {point.notes && (
                            <p style={{ fontSize: '0.8125rem', color: '#6f6f6f', fontStyle: 'italic' }}>
                              {point.notes}
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}

            {/* Add isolation point form */}
            {status !== 'archived' && (
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '1rem' }}>
                  Add Isolation Point
                </h3>
                <form action={async (fd: FormData) => { 'use server'; await createLotoIsolationPoint(fd) }}>
                  <input type="hidden" name="procedure_id" value={id} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label htmlFor="location_description" style={{ display: 'block', fontSize: '0.75rem', color: '#525252', marginBottom: '0.25rem' }}>
                        Location / Equipment <span style={{ color: '#da1e28' }}>*</span>
                      </label>
                      <input
                        id="location_description"
                        name="location_description"
                        required
                        placeholder="e.g. Main isolator switch, Panel DB-3"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #8d8d8d',
                          fontSize: '0.875rem',
                          color: '#161616',
                          backgroundColor: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="isolation_method" style={{ display: 'block', fontSize: '0.75rem', color: '#525252', marginBottom: '0.25rem' }}>
                        Isolation Method <span style={{ color: '#da1e28' }}>*</span>
                      </label>
                      <input
                        id="isolation_method"
                        name="isolation_method"
                        required
                        placeholder="e.g. Turn off and lock out isolator"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #8d8d8d',
                          fontSize: '0.875rem',
                          color: '#161616',
                          backgroundColor: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="energy_type_id" style={{ display: 'block', fontSize: '0.75rem', color: '#525252', marginBottom: '0.25rem' }}>
                        Energy Type
                      </label>
                      <select
                        id="energy_type_id"
                        name="energy_type_id"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #8d8d8d',
                          fontSize: '0.875rem',
                          color: '#161616',
                          backgroundColor: '#fff',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="">Select energy type…</option>
                        {(energyTypes ?? []).map(et => (
                          <option key={et.id} value={et.id}>{et.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="lock_device_type" style={{ display: 'block', fontSize: '0.75rem', color: '#525252', marginBottom: '0.25rem' }}>
                        Lock / Device Type
                      </label>
                      <input
                        id="lock_device_type"
                        name="lock_device_type"
                        placeholder="e.g. Red padlock, hasp"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #8d8d8d',
                          fontSize: '0.875rem',
                          color: '#161616',
                          backgroundColor: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="verification_method" style={{ display: 'block', fontSize: '0.75rem', color: '#525252', marginBottom: '0.25rem' }}>
                        Verification Method
                      </label>
                      <input
                        id="verification_method"
                        name="verification_method"
                        placeholder="e.g. Test with voltage tester"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #8d8d8d',
                          fontSize: '0.875rem',
                          color: '#161616',
                          backgroundColor: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="notes" style={{ display: 'block', fontSize: '0.75rem', color: '#525252', marginBottom: '0.25rem' }}>
                        Notes
                      </label>
                      <input
                        id="notes"
                        name="notes"
                        placeholder="Optional notes…"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #8d8d8d',
                          fontSize: '0.875rem',
                          color: '#161616',
                          backgroundColor: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                  <Button type="submit" kind="secondary" size="sm">Add Step</Button>
                </form>
              </div>
            )}
          </Tile>

        </Column>

        {/* Right column */}
        <Column sm={4} md={8} lg={6}>

          {/* Authorizations */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Authorizations (Work Orders)
                {authorizations && authorizations.length > 0 && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 400, color: '#525252' }}>
                    ({authorizations.length})
                  </span>
                )}
              </h2>
            </div>

            {!authorizations || authorizations.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No authorizations yet.
                {status === 'approved' && ' Authorize a job below.'}
                {status !== 'approved' && ' Approve the procedure first.'}
              </div>
            ) : (
              <div style={{ padding: '1rem 1.5rem' }}>
                {authorizations.map((auth, idx) => {
                  const authByRaw = (auth as Record<string, unknown>).authorized_by_profile
                  const authBy = Array.isArray(authByRaw)
                    ? (authByRaw[0] as { first_name: string; last_name: string } | undefined) ?? null
                    : (authByRaw as { first_name: string; last_name: string } | null)
                  return (
                    <div
                      key={auth.id}
                      style={{
                        paddingBottom: idx < authorizations.length - 1 ? '1rem' : 0,
                        marginBottom: idx < authorizations.length - 1 ? '1rem' : 0,
                        borderBottom: idx < authorizations.length - 1 ? '1px solid #e0e0e0' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#161616' }}>
                          {auth.authorization_number ?? '—'}
                        </span>
                        <AuthStatusTag status={auth.status} />
                      </div>
                      <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.375rem' }}>
                        {auth.job_description}
                      </p>
                      {authBy && (
                        <p style={{ fontSize: '0.8125rem', color: '#525252', marginBottom: '0.25rem' }}>
                          Authorised by {authBy.first_name} {authBy.last_name}
                        </p>
                      )}
                      {auth.work_start_at && (
                        <p style={{ fontSize: '0.8125rem', color: '#6f6f6f' }}>
                          {formatDateTime(auth.work_start_at as string | null)}
                          {auth.work_end_at && ` – ${formatDateTime(auth.work_end_at as string | null)}`}
                        </p>
                      )}
                      {/* Complete / Cancel actions */}
                      {auth.status === 'active' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <form action={async (_fd: FormData) => {
                            'use server'
                            await updateLotoAuthorizationStatus(auth.id, id, 'completed')
                          }}>
                            <Button type="submit" kind="ghost" size="sm">Mark Complete</Button>
                          </form>
                          <form action={async (_fd: FormData) => {
                            'use server'
                            await updateLotoAuthorizationStatus(auth.id, id, 'cancelled')
                          }}>
                            <Button type="submit" kind="danger--ghost" size="sm">Cancel</Button>
                          </form>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* New authorization form — only when approved */}
            {status === 'approved' && (
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '1rem' }}>
                  Authorize New Job
                </h3>
                <form action={async (fd: FormData) => { 'use server'; await createLotoAuthorization(fd) }}>
                  <input type="hidden" name="procedure_id" value={id} />
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="job_description" style={{ display: 'block', fontSize: '0.75rem', color: '#525252', marginBottom: '0.25rem' }}>
                      Job Description <span style={{ color: '#da1e28' }}>*</span>
                    </label>
                    <textarea
                      id="job_description"
                      name="job_description"
                      required
                      rows={3}
                      placeholder="Describe the work to be performed under this LOTO…"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #8d8d8d',
                        fontSize: '0.875rem',
                        color: '#161616',
                        backgroundColor: '#fff',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label htmlFor="work_start_at" style={{ display: 'block', fontSize: '0.75rem', color: '#525252', marginBottom: '0.25rem' }}>
                        Work Start
                      </label>
                      <input
                        id="work_start_at"
                        name="work_start_at"
                        type="datetime-local"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #8d8d8d',
                          fontSize: '0.875rem',
                          color: '#161616',
                          backgroundColor: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="work_end_at" style={{ display: 'block', fontSize: '0.75rem', color: '#525252', marginBottom: '0.25rem' }}>
                        Work End (Est.)
                      </label>
                      <input
                        id="work_end_at"
                        name="work_end_at"
                        type="datetime-local"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #8d8d8d',
                          fontSize: '0.875rem',
                          color: '#161616',
                          backgroundColor: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                  <Button type="submit" kind="primary" size="sm">Authorize Job</Button>
                </form>
              </div>
            )}
          </Tile>

        </Column>
      </Grid>
    </div>
  )
}
