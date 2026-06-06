import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem, Button } from '@carbon/react'
import { updateJsaStatus } from '@/app/actions/jsa'

type TagTypeValue = 'gray' | 'blue' | 'teal' | 'purple' | 'red' | 'green' | 'cyan'

function statusTagType(status: string): TagTypeValue {
  const map: Record<string, TagTypeValue> = {
    draft: 'gray',
    under_review: 'blue',
    approved: 'green',
    archived: 'gray',
  }
  return map[status] ?? 'gray'
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
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
        fontWeight: 600,
      }}>
        {label}
      </p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

function RiskBadge({ likelihood, consequence }: { likelihood: number | null; consequence: number | null }) {
  if (!likelihood || !consequence) return <span style={{ color: '#6f6f6f', fontSize: '0.75rem' }}>—</span>
  const score = likelihood * consequence
  let color = '#24a148'
  if (score >= 16) color = '#da1e28'
  else if (score >= 9) color = '#c95000'
  else if (score >= 4) color = '#b08800'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      fontSize: '0.75rem',
      fontWeight: 600,
      color,
    }}>
      {likelihood} × {consequence} = {score}
    </span>
  )
}

interface JsaControl {
  id: string
  control_description: string
  control_hierarchy: string | null
  responsible_person: string | null
  residual_likelihood: number | null
  residual_consequence: number | null
}

interface JsaHazard {
  id: string
  hazard_description: string
  hazard_type: string | null
  likelihood: number | null
  consequence: number | null
  jsa_step_controls: JsaControl[]
}

interface JsaStep {
  id: string
  step_number: number
  description: string
  jsa_step_hazards: JsaHazard[]
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function JsaDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: jsa } = await supabase
    .from('jsas')
    .select(`
      id, jsa_number, title, job_description, location, status,
      valid_from, valid_until, revision_number,
      created_at, updated_at, approved_at,
      prepared_by, approved_by,
      user_profiles!jsas_prepared_by_fkey(first_name, last_name),
      sites(name)
    `)
    .eq('id', id)
    .single()

  if (!jsa) notFound()

  const { data: steps } = await supabase
    .from('jsa_steps')
    .select(`
      id, step_number, description,
      jsa_step_hazards(
        id, hazard_description, hazard_type, likelihood, consequence,
        jsa_step_controls(
          id, control_description, control_hierarchy, responsible_person,
          residual_likelihood, residual_consequence
        )
      )
    `)
    .eq('jsa_id', id)
    .order('step_number', { ascending: true })

  const { data: workers } = await supabase
    .from('jsa_workers')
    .select('id, worker_name, signature_obtained, signed_at')
    .eq('jsa_id', id)
    .order('worker_name', { ascending: true })

  const preparedByRaw = jsa.user_profiles
  const preparedBy = Array.isArray(preparedByRaw)
    ? (preparedByRaw[0] as { first_name: string; last_name: string } | undefined) ?? null
    : (preparedByRaw as { first_name: string; last_name: string } | null)

  const siteRaw = jsa.sites
  const site = Array.isArray(siteRaw)
    ? (siteRaw[0] as { name: string } | undefined) ?? null
    : (siteRaw as { name: string } | null)

  const typedSteps = (steps ?? []) as unknown as JsaStep[]

  const totalHazards = typedSteps.reduce((acc, s) => acc + s.jsa_step_hazards.length, 0)
  const totalControls = typedSteps.reduce(
    (acc, s) => acc + s.jsa_step_hazards.reduce((a, h) => a + h.jsa_step_controls.length, 0),
    0
  )

  const canApprove = jsa.status === 'under_review'
  const canSubmitForReview = jsa.status === 'draft'
  const canArchive = jsa.status === 'approved'

  async function handleSubmitForReview() {
    'use server'
    await updateJsaStatus(id, 'under_review')
  }

  async function handleApprove() {
    'use server'
    await updateJsaStatus(id, 'approved')
  }

  async function handleArchive() {
    'use server'
    await updateJsaStatus(id, 'archived')
  }

  const hierarchyLabel: Record<string, string> = {
    elimination: 'Elimination',
    substitution: 'Substitution',
    engineering: 'Engineering',
    administrative: 'Administrative',
    ppe: 'PPE',
  }

  const hierarchyColor: Record<string, string> = {
    elimination: '#da1e28',
    substitution: '#f1620a',
    engineering: '#b08800',
    administrative: '#0f62fe',
    ppe: '#6929c4',
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/jsa">JSA / JHA Builder</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{jsa.jsa_number ?? id.slice(0, 8)}</BreadcrumbItem>
      </Breadcrumb>

      {/* Page Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#525252', fontFamily: 'monospace' }}>
              {jsa.jsa_number ?? '—'}
            </p>
            <Tag type={statusTagType(jsa.status)} size="sm">
              {jsa.status.replace(/_/g, ' ')}
            </Tag>
            {jsa.revision_number && jsa.revision_number > 1 && (
              <Tag type="cyan" size="sm">Rev {jsa.revision_number}</Tag>
            )}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>
            {jsa.title}
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>
            Created {formatDate(jsa.created_at)}
            {jsa.updated_at && jsa.updated_at !== jsa.created_at && ` · Updated ${formatDateTime(jsa.updated_at)}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
          <Button kind="ghost" href={`/jsa/${id}/edit`} size="sm">
            Edit
          </Button>
          {canSubmitForReview && (
            <form action={handleSubmitForReview}>
              <Button kind="secondary" type="submit" size="sm">
                Submit for Review
              </Button>
            </form>
          )}
          {canApprove && (
            <form action={handleApprove}>
              <Button kind="primary" type="submit" size="sm">
                Approve
              </Button>
            </form>
          )}
          {canArchive && (
            <form action={handleArchive}>
              <Button kind="ghost" type="submit" size="sm">
                Archive
              </Button>
            </form>
          )}
        </div>
      </div>

      <Grid condensed>
        {/* Main content — steps */}
        <Column sm={4} md={8} lg={12}>

          {/* Summary tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { label: 'Steps', value: typedSteps.length },
              { label: 'Hazards', value: totalHazards },
              { label: 'Controls', value: totalControls },
            ].map(item => (
              <Tile key={item.label} style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>{item.value}</p>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>{item.label}</p>
              </Tile>
            ))}
          </div>

          {/* Job Description */}
          {jsa.job_description && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Job Description</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#525252', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {jsa.job_description}
                </p>
              </div>
            </Tile>
          )}

          {/* Steps */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Job Steps</h2>
              <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                {typedSteps.length} step{typedSteps.length !== 1 ? 's' : ''}
              </span>
            </div>

            {typedSteps.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No steps recorded yet.
              </div>
            ) : (
              <div>
                {typedSteps.map((step, stepIdx) => (
                  <div
                    key={step.id}
                    style={{
                      borderBottom: stepIdx < typedSteps.length - 1 ? '1px solid #e0e0e0' : 'none',
                    }}
                  >
                    {/* Step header */}
                    <div style={{
                      padding: '1rem 1.5rem',
                      backgroundColor: '#f4f4f4',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}>
                      <div style={{
                        minWidth: '1.75rem',
                        height: '1.75rem',
                        borderRadius: '50%',
                        backgroundColor: '#0f62fe',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {step.step_number}
                      </div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', flex: 1 }}>
                        {step.description}
                      </p>
                      {step.jsa_step_hazards.length > 0 && (
                        <span style={{ fontSize: '0.75rem', color: '#6f6f6f', flexShrink: 0 }}>
                          {step.jsa_step_hazards.length} hazard{step.jsa_step_hazards.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Hazards for this step */}
                    {step.jsa_step_hazards.length > 0 && (
                      <div style={{ paddingLeft: '2.5rem' }}>
                        {step.jsa_step_hazards.map((hazard, hIdx) => (
                          <div
                            key={hazard.id}
                            style={{
                              borderTop: '1px solid #e0e0e0',
                              padding: '1rem 1.5rem 1rem 0',
                            }}
                          >
                            {/* Hazard row */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.125rem 0.5rem',
                                backgroundColor: 'rgba(218,30,40,0.1)',
                                color: '#da1e28',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.32px',
                                borderRadius: '2px',
                                flexShrink: 0,
                              }}>
                                ⚠ Hazard {hIdx + 1}
                              </div>
                              {hazard.hazard_type && (
                                <span style={{
                                  padding: '0.125rem 0.5rem',
                                  backgroundColor: '#f4f4f4',
                                  color: '#525252',
                                  fontSize: '0.6875rem',
                                  fontWeight: 600,
                                  borderRadius: '2px',
                                  textTransform: 'capitalize',
                                }}>
                                  {hazard.hazard_type.replace(/_/g, ' ')}
                                </span>
                              )}
                              <span style={{ marginLeft: 'auto' }}>
                                <RiskBadge likelihood={hazard.likelihood} consequence={hazard.consequence} />
                              </span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                              {hazard.hazard_description}
                            </p>

                            {/* Controls for this hazard */}
                            {hazard.jsa_step_controls.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {hazard.jsa_step_controls.map(ctrl => (
                                  <div
                                    key={ctrl.id}
                                    style={{
                                      padding: '0.75rem 1rem',
                                      backgroundColor: '#defbe6',
                                      borderLeft: '3px solid #24a148',
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '0.75rem',
                                    }}
                                  >
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                        <span style={{
                                          padding: '0.125rem 0.5rem',
                                          backgroundColor:
                                            ctrl.control_hierarchy
                                              ? `${hierarchyColor[ctrl.control_hierarchy] ?? '#525252'}22`
                                              : '#f4f4f4',
                                          color: ctrl.control_hierarchy
                                            ? (hierarchyColor[ctrl.control_hierarchy] ?? '#525252')
                                            : '#525252',
                                          fontSize: '0.6875rem',
                                          fontWeight: 700,
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.32px',
                                          borderRadius: '2px',
                                          flexShrink: 0,
                                        }}>
                                          {ctrl.control_hierarchy
                                            ? (hierarchyLabel[ctrl.control_hierarchy] ?? ctrl.control_hierarchy)
                                            : 'Control'}
                                        </span>
                                        {ctrl.responsible_person && (
                                          <span style={{ fontSize: '0.75rem', color: '#525252' }}>
                                            {ctrl.responsible_person}
                                          </span>
                                        )}
                                        {(ctrl.residual_likelihood && ctrl.residual_consequence) && (
                                          <span style={{ fontSize: '0.75rem', color: '#6f6f6f', marginLeft: 'auto' }}>
                                            Residual: <RiskBadge likelihood={ctrl.residual_likelihood} consequence={ctrl.residual_consequence} />
                                          </span>
                                        )}
                                      </div>
                                      <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.5 }}>
                                        {ctrl.control_description}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {hazard.jsa_step_controls.length === 0 && (
                              <p style={{ fontSize: '0.75rem', color: '#6f6f6f', fontStyle: 'italic' }}>
                                No controls recorded for this hazard
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {step.jsa_step_hazards.length === 0 && (
                      <div style={{ padding: '0.875rem 1.5rem', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0' }}>
                        <p style={{ fontSize: '0.75rem', color: '#6f6f6f', fontStyle: 'italic' }}>
                          No hazards identified for this step
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Tile>

          {/* Workers / Signatories */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Workers / Signatories</h2>
              <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                {(workers ?? []).length} worker{(workers ?? []).length !== 1 ? 's' : ''}
              </span>
            </div>
            {(workers ?? []).length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No workers assigned to this JSA
              </div>
            ) : (
              <div>
                {(workers ?? []).map((w, wIdx) => (
                  <div
                    key={w.id}
                    style={{
                      padding: '0.875rem 1.5rem',
                      borderBottom: wIdx < (workers ?? []).length - 1 ? '1px solid #e0e0e0' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <p style={{ fontSize: '0.875rem', color: '#161616' }}>{w.worker_name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {w.signature_obtained ? (
                        <Tag type="green" size="sm">Signed</Tag>
                      ) : (
                        <Tag type="gray" size="sm">Unsigned</Tag>
                      )}
                      {w.signed_at && (
                        <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                          {formatDate(w.signed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tile>
        </Column>

        {/* Right column — metadata */}
        <Column sm={4} md={8} lg={4}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <DetailRow label="Status">
                <Tag type={statusTagType(jsa.status)} size="sm">
                  {jsa.status.replace(/_/g, ' ')}
                </Tag>
              </DetailRow>
              <DetailRow label="Location">
                {jsa.location ?? '—'}
              </DetailRow>
              <DetailRow label="Site">
                {site?.name ?? '—'}
              </DetailRow>
              <DetailRow label="Prepared By">
                {preparedBy ? `${preparedBy.first_name} ${preparedBy.last_name}` : '—'}
              </DetailRow>
              <DetailRow label="Valid From">
                {formatDate(jsa.valid_from)}
              </DetailRow>
              <DetailRow label="Valid Until">
                {formatDate(jsa.valid_until)}
              </DetailRow>
              {jsa.approved_at && (
                <DetailRow label="Approved">
                  {formatDateTime(jsa.approved_at)}
                </DetailRow>
              )}
              <DetailRow label="Revision">
                {jsa.revision_number ?? 1}
              </DetailRow>
              <DetailRow label="Created">
                {formatDate(jsa.created_at)}
              </DetailRow>
            </div>
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
