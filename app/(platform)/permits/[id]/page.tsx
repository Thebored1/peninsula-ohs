import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem, Button,
  InlineNotification, Table, TableHead, TableRow, TableHeader, TableBody, TableCell,
  TableContainer, TextInput, TextArea, Select, SelectItem,
} from '@carbon/react'
import {
  updatePermitStatus, cancelPermit, closePermit,
  approvePermitStep, rejectPermitStep,
  addPermitWorker, addPermitHazard, addPermitControl, addPermitPPE, addPermitCondition, addPermitApprovalStep,
} from '@/app/actions/permits'

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{label}</p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>{title}</h2>
      {action}
    </div>
  )
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Form action props must return void — this cast discards the { error? } return value safely
const act = (fn: (fd: FormData) => Promise<unknown>) => fn as unknown as (fd: FormData) => Promise<void>

interface PageProps { params: Promise<{ id: string }> }

export default async function PermitDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: permit } = await supabase
    .from('permits')
    .select(`
      id, permit_number, title, work_description, exact_location,
      valid_from, valid_until, actual_start, actual_end,
      rescue_plan, notes, closure_notes,
      post_work_check_required, post_work_check_completed,
      work_completed_at, site_cleared_at, created_at,
      applicant_id, responsible_person_id, risk_id,
      permit_types(name, code, rescue_plan_required, isolation_required),
      permit_statuses(name, colour_code, code, is_active_work, is_terminal)
    `)
    .eq('id', id)
    .single()

  if (!permit) notFound()

  const statusObj = (() => {
    const raw = permit.permit_statuses
    const s = Array.isArray(raw) ? raw[0] ?? null : raw
    return s as { name: string; colour_code: string; code: string; is_active_work: boolean; is_terminal: boolean } | null
  })()
  const typeObj = (() => {
    const raw = permit.permit_types
    const t = Array.isArray(raw) ? raw[0] ?? null : raw
    return t as { name: string; code: string; rescue_plan_required: boolean; isolation_required: boolean } | null
  })()

  // People
  const [applicantData, responsibleData] = await Promise.all([
    permit.applicant_id ? supabase.from('user_profiles').select('first_name, last_name').eq('id', permit.applicant_id).single() : Promise.resolve({ data: null }),
    permit.responsible_person_id ? supabase.from('user_profiles').select('first_name, last_name').eq('id', permit.responsible_person_id).single() : Promise.resolve({ data: null }),
  ])
  const applicant = applicantData.data
  const responsible = responsibleData.data

  // Related records
  const [
    { data: workers },
    { data: hazards },
    { data: controls },
    { data: ppeReqs },
    { data: approvals },
    { data: conditions },
    { data: isolationCerts },
    { data: ppeTypes },
    { data: users },
  ] = await Promise.all([
    supabase.from('permit_workers').select('id, full_name, employer, role_on_job, induction_verified').eq('permit_id', id),
    supabase.from('permit_hazards').select('id, hazard_description, potential_harm, likelihood, consequence').eq('permit_id', id),
    supabase.from('permit_control_measures').select('id, control_type, description, is_verified, hazard_id').eq('permit_id', id).order('control_type'),
    supabase.from('permit_ppe_requirements').select('id, specification, is_mandatory, ppe_types(name)').eq('permit_id', id),
    supabase.from('permit_approvals').select('id, step_name, decision, decision_notes, decided_at, order_index, approver_id').eq('permit_id', id).order('order_index'),
    supabase.from('permit_conditions').select('id, condition_text, is_met, verified_at').eq('permit_id', id),
    supabase.from('permit_isolation_certs').select('id, cert_number, isolation_type, description, is_active, isolated_at, de_isolated_at').eq('permit_id', id),
    supabase.from('ppe_types').select('id, name').eq('is_active', true).order('display_order'),
    supabase.from('user_profiles').select('id, first_name, last_name').order('first_name'),
  ])

  const statusCode = statusObj?.code ?? ''
  const isTerminal = statusObj?.is_terminal ?? false
  const isExpired = permit.valid_until ? new Date(permit.valid_until) < new Date() : false
  const pendingApproval = (approvals ?? []).find(a => a.decision === 'pending')

  // Status transition helpers
  const nextStatusMap: Record<string, { code: string; label: string; kind: 'primary' | 'secondary' | 'danger--ghost' }> = {
    draft: { code: 'submitted', label: 'Submit for Approval', kind: 'primary' },
    approved: { code: 'issued', label: 'Issue Permit', kind: 'primary' },
    issued: { code: 'active', label: 'Mark Work Active', kind: 'primary' },
    active: { code: 'work_completed', label: 'Mark Work Complete', kind: 'secondary' },
    work_completed: { code: 'site_cleared', label: 'Confirm Site Cleared', kind: 'secondary' },
  }
  const nextTransition = nextStatusMap[statusCode]

  async function handleStatusChange(formData: FormData) {
    'use server'
    const code = formData.get('status_code') as string
    await updatePermitStatus(id, code)
  }
  async function handleClose(formData: FormData) {
    'use server'
    const notes = formData.get('closure_notes') as string
    await closePermit(id, notes)
  }
  async function handleCancel() {
    'use server'
    await cancelPermit(id)
  }

  const CONTROL_LABELS: Record<string, string> = {
    eliminate: 'Eliminate', substitute: 'Substitute', engineer: 'Engineering',
    admin: 'Administrative', ppe: 'PPE',
  }
  const CONTROL_COLOURS: Record<string, string> = {
    eliminate: '#24a148', substitute: '#0e6027', engineer: '#0f62fe',
    admin: '#eab308', ppe: '#f97316',
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/permits">Permits to Work</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{permit.permit_number ?? id.slice(0, 8)}</BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            {permit.permit_number ?? '—'}
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>{permit.title}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusObj?.colour_code ?? '#6b7280' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{statusObj?.name ?? '—'}</span>
            </div>
            {typeObj && <Tag type="blue" size="md">{typeObj.name}</Tag>}
            {isExpired && !isTerminal && <Tag type="red" size="md">Expired</Tag>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
          {nextTransition && !isTerminal && (
            <form action={handleStatusChange}>
              <input type="hidden" name="status_code" value={nextTransition.code} />
              <Button type="submit" kind={nextTransition.kind} size="sm">{nextTransition.label}</Button>
            </form>
          )}
          {statusCode === 'site_cleared' && (
            <form action={handleClose}>
              <input type="hidden" name="closure_notes" value="Permit closed after site clearance." />
              <Button type="submit" kind="primary" size="sm">Close Permit</Button>
            </form>
          )}
          {!isTerminal && !['draft'].includes(statusCode) && (
            <form action={handleCancel}>
              <Button type="submit" kind="danger--ghost" size="sm">Cancel Permit</Button>
            </form>
          )}
        </div>
      </div>

      {/* Expiry warning */}
      {isExpired && statusObj?.is_active_work && (
        <div style={{ marginBottom: '1.5rem' }}>
          <InlineNotification kind="error" title="Permit Expired"
            subtitle="This permit has passed its valid until date. Work must stop immediately until a new permit is obtained."
            lowContrast />
        </div>
      )}

      <Grid condensed>
        {/* Left */}
        <Column sm={4} md={8} lg={10}>
          {/* Details */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <SectionHeader title="Permit Details" />
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}><DetailRow label="Type">{typeObj?.name ?? '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Applicant">{applicant ? `${applicant.first_name} ${applicant.last_name}` : '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Responsible Person">{responsible ? `${responsible.first_name} ${responsible.last_name}` : '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Location">{permit.exact_location ?? '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Valid From">{formatDateTime(permit.valid_from)}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Valid Until">
                    <span style={{ color: isExpired ? '#da1e28' : '#161616' }}>{formatDateTime(permit.valid_until)}</span>
                  </DetailRow>
                </Column>
              </Grid>
              <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                <DetailRow label="Work Description">
                  <p style={{ lineHeight: 1.6 }}>{permit.work_description}</p>
                </DetailRow>
              </div>
              {permit.rescue_plan && <DetailRow label="Rescue Plan"><p style={{ lineHeight: 1.6 }}>{permit.rescue_plan}</p></DetailRow>}
            </div>
          </Tile>

          {/* Workers */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <SectionHeader title={`Workers (${(workers ?? []).length})`} />
            {(workers ?? []).length === 0 ? (
              <div style={{ padding: '1.5rem', color: '#6f6f6f', fontSize: '0.875rem' }}>No workers added yet.</div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader><TableHeader>Employer</TableHeader>
                      <TableHeader>Role</TableHeader><TableHeader>Inducted</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(workers ?? []).map(w => (
                      <TableRow key={w.id}>
                        <TableCell>{w.full_name}</TableCell>
                        <TableCell>{w.employer ?? '—'}</TableCell>
                        <TableCell>{w.role_on_job ?? '—'}</TableCell>
                        <TableCell><Tag type={w.induction_verified ? 'green' : 'red'} size="sm">{w.induction_verified ? 'Yes' : 'No'}</Tag></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {!isTerminal && (
              <form action={act(addPermitWorker)} style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e0e0e0' }}>
                <input type="hidden" name="permit_id" value={id} />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2, minWidth: '150px' }}>
                    <TextInput id="wname" name="full_name" labelText="Name" placeholder="Full name" size="sm" />
                  </div>
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <TextInput id="wemployer" name="employer" labelText="Employer" placeholder="Company" size="sm" />
                  </div>
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <TextInput id="wrole" name="role_on_job" labelText="Role" placeholder="e.g. Welder" size="sm" />
                  </div>
                  <Button type="submit" kind="ghost" size="sm">Add Worker</Button>
                </div>
              </form>
            )}
          </Tile>

          {/* Hazards & Controls */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <SectionHeader title={`Hazards & Controls (${(hazards ?? []).length} hazards)`} />
            {(hazards ?? []).length === 0 ? (
              <div style={{ padding: '1.5rem', color: '#6f6f6f', fontSize: '0.875rem' }}>No hazards identified yet.</div>
            ) : (
              <div style={{ padding: '1rem 1.5rem' }}>
                {(hazards ?? []).map(h => {
                  const hControls = (controls ?? []).filter(c => c.hazard_id === h.id)
                  return (
                    <div key={h.id} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #f4f4f4' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#161616', marginBottom: '0.25rem' }}>{h.hazard_description}</p>
                      {h.potential_harm && <p style={{ fontSize: '0.8125rem', color: '#525252', marginBottom: '0.5rem' }}>Potential harm: {h.potential_harm}</p>}
                      {hControls.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          {hControls.map(c => (
                            <div key={c.id} style={{
                              fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '2px',
                              backgroundColor: CONTROL_COLOURS[c.control_type] + '20',
                              border: `1px solid ${CONTROL_COLOURS[c.control_type]}`,
                              color: CONTROL_COLOURS[c.control_type],
                            }}>
                              {CONTROL_LABELS[c.control_type]}: {c.description}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {!isTerminal && (
              <div style={{ borderTop: '1px solid #e0e0e0' }}>
                <form action={act(addPermitHazard)} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f4f4f4' }}>
                  <input type="hidden" name="permit_id" value={id} />
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 2, minWidth: '200px' }}>
                      <TextInput id="hdesc" name="hazard_description" labelText="Hazard Description" placeholder="Describe the hazard…" size="sm" />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <TextInput id="hharm" name="potential_harm" labelText="Potential Harm" placeholder="e.g. Burns, cuts" size="sm" />
                    </div>
                    <Button type="submit" kind="ghost" size="sm">Add Hazard</Button>
                  </div>
                </form>
                <form action={act(addPermitControl)} style={{ padding: '1rem 1.5rem' }}>
                  <input type="hidden" name="permit_id" value={id} />
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ width: '160px' }}>
                      <Select id="ctype" name="control_type" labelText="Control Type" size="sm">
                        {Object.entries(CONTROL_LABELS).map(([v, l]) => <SelectItem key={v} value={v} text={l} />)}
                      </Select>
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <TextInput id="cdesc" name="description" labelText="Control Description" placeholder="Describe the control measure…" size="sm" />
                    </div>
                    <Button type="submit" kind="ghost" size="sm">Add Control</Button>
                  </div>
                </form>
              </div>
            )}
          </Tile>

          {/* PPE Requirements */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <SectionHeader title={`PPE Requirements (${(ppeReqs ?? []).length})`} />
            {(ppeReqs ?? []).length === 0 ? (
              <div style={{ padding: '1.5rem', color: '#6f6f6f', fontSize: '0.875rem' }}>No PPE requirements added.</div>
            ) : (
              <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(ppeReqs ?? []).map(p => {
                  const ppeRaw = p.ppe_types
                  const ppe = Array.isArray(ppeRaw) ? ppeRaw[0] ?? null : ppeRaw
                  return (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem', border: '1px solid #e0e0e0', borderRadius: '4px', minWidth: '100px', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#161616' }}>{(ppe as { name: string } | null)?.name ?? '—'}</p>
                      {p.specification && <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>{p.specification}</p>}
                      {p.is_mandatory && <Tag type="red" size="sm" style={{ marginTop: '0.25rem' }}>Mandatory</Tag>}
                    </div>
                  )
                })}
              </div>
            )}
            {!isTerminal && ppeTypes && (
              <form action={act(addPermitPPE)} style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e0e0e0' }}>
                <input type="hidden" name="permit_id" value={id} />
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <Select id="ppeid" name="ppe_type_id" labelText="PPE Type" size="sm">
                      <SelectItem value="" text="Select PPE…" />
                      {(ppeTypes ?? []).map(pt => <SelectItem key={pt.id} value={pt.id} text={pt.name} />)}
                    </Select>
                  </div>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <TextInput id="ppespec" name="specification" labelText="Specification (optional)" placeholder="e.g. P2 rated" size="sm" />
                  </div>
                  <Button type="submit" kind="ghost" size="sm">Add PPE</Button>
                </div>
              </form>
            )}
          </Tile>

          {/* Conditions */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <SectionHeader title={`Conditions (${(conditions ?? []).length})`} />
            {(conditions ?? []).length === 0 ? (
              <div style={{ padding: '1.5rem', color: '#6f6f6f', fontSize: '0.875rem' }}>No conditions attached.</div>
            ) : (
              <div style={{ padding: '1rem 1.5rem' }}>
                {(conditions ?? []).map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f4f4f4', alignItems: 'flex-start' }}>
                    <span style={{ color: '#6f6f6f', fontSize: '0.75rem', minWidth: '1.25rem', paddingTop: '0.125rem' }}>{i + 1}.</span>
                    <p style={{ flex: 1, fontSize: '0.875rem', color: '#161616' }}>{c.condition_text}</p>
                    <Tag type={c.is_met ? 'green' : 'red'} size="sm">{c.is_met ? 'Met' : 'Pending'}</Tag>
                  </div>
                ))}
              </div>
            )}
            {!isTerminal && (
              <form action={act(addPermitCondition)} style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e0e0e0' }}>
                <input type="hidden" name="permit_id" value={id} />
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <TextInput id="condtext" name="condition_text" labelText="Condition" placeholder="e.g. Fire extinguisher must be present at worksite" size="sm" />
                  </div>
                  <Button type="submit" kind="ghost" size="sm">Add Condition</Button>
                </div>
              </form>
            )}
          </Tile>

          {/* Isolation Certs (if type requires) */}
          {(typeObj?.isolation_required || (isolationCerts ?? []).length > 0) && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <SectionHeader title={`Isolation Certificates (${(isolationCerts ?? []).length})`} />
              {(isolationCerts ?? []).length === 0 ? (
                <div style={{ padding: '1.5rem', color: '#6f6f6f', fontSize: '0.875rem' }}>No isolation certificates added yet.</div>
              ) : (
                <TableContainer>
                  <Table size="sm">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Cert #</TableHeader><TableHeader>Type</TableHeader>
                        <TableHeader>Description</TableHeader><TableHeader>Status</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(isolationCerts ?? []).map(ic => (
                        <TableRow key={ic.id}>
                          <TableCell><span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{ic.cert_number ?? '—'}</span></TableCell>
                          <TableCell>{ic.isolation_type}</TableCell>
                          <TableCell style={{ fontSize: '0.8125rem' }}>{ic.description}</TableCell>
                          <TableCell>
                            <Tag type={ic.is_active ? (ic.isolated_at && !ic.de_isolated_at ? 'red' : 'green') : 'gray'} size="sm">
                              {ic.de_isolated_at ? 'De-isolated' : ic.isolated_at ? 'Isolated' : 'Pending'}
                            </Tag>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Tile>
          )}
        </Column>

        {/* Right */}
        <Column sm={4} md={8} lg={6}>
          {/* Approval Chain */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <SectionHeader title={`Approval Chain (${(approvals ?? []).length} steps)`} />
            {(approvals ?? []).length === 0 ? (
              <div style={{ padding: '1.5rem', color: '#6f6f6f', fontSize: '0.875rem' }}>No approval steps configured.</div>
            ) : (
              <div style={{ padding: '1rem 1.5rem' }}>
                {(approvals ?? []).map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #f4f4f4', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: a.decision === 'approved' ? '#24a148' : a.decision === 'rejected' ? '#da1e28' : '#e0e0e0',
                      color: a.decision !== 'pending' ? '#fff' : '#525252',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {a.decision === 'approved' ? '✓' : a.decision === 'rejected' ? '✗' : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#161616' }}>{a.step_name}</p>
                      {a.decision_notes && <p style={{ fontSize: '0.8125rem', color: '#525252', marginTop: '0.25rem' }}>{a.decision_notes}</p>}
                      {a.decided_at && <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.125rem' }}>
                        {a.decision === 'approved' ? 'Approved' : 'Decided'}: {new Date(a.decided_at).toLocaleDateString('en-AU')}
                      </p>}
                    </div>
                    {a.decision === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <form action={async (fd: FormData) => {
                          'use server'
                          await approvePermitStep(id, a.id, fd.get('notes') as string)
                        }}>
                          <input type="hidden" name="notes" value="" />
                          <Button type="submit" kind="primary" size="sm">Approve</Button>
                        </form>
                        <form action={async (fd: FormData) => {
                          'use server'
                          await rejectPermitStep(id, a.id, fd.get('notes') as string)
                        }}>
                          <input type="hidden" name="notes" value="" />
                          <Button type="submit" kind="danger--ghost" size="sm">Reject</Button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!isTerminal && (
              <form action={act(addPermitApprovalStep)} style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e0e0e0' }}>
                <input type="hidden" name="permit_id" value={id} />
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <TextInput id="stepname" name="step_name" labelText="Step Name" placeholder="e.g. HSE Approval" size="sm" />
                  </div>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <Select id="approver" name="approver_id" labelText="Approver" size="sm">
                      <SelectItem value="" text="Assign later" />
                      {(users ?? []).map(u => <SelectItem key={u.id} value={u.id} text={`${u.first_name} ${u.last_name}`} />)}
                    </Select>
                  </div>
                  <Button type="submit" kind="ghost" size="sm">Add Step</Button>
                </div>
              </form>
            )}
          </Tile>

          {/* Closure section */}
          {['site_cleared'].includes(statusCode) && (
            <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>Close Permit</h2>
              <form action={handleClose}>
                <TextArea id="cnotes" name="closure_notes" labelText="Closure Notes" rows={3}
                  placeholder="Confirm all work is complete and site is clear…" style={{ marginBottom: '1rem' }} />
                <Button type="submit" kind="primary" size="sm">Close Permit</Button>
              </form>
            </Tile>
          )}

          {/* Closure notes (if closed) */}
          {permit.closure_notes && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <SectionHeader title="Closure Notes" />
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{permit.closure_notes}</p>
              </div>
            </Tile>
          )}
        </Column>
      </Grid>
    </div>
  )
}
