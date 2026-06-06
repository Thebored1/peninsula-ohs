import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem } from '@carbon/react'
import LinkIncidentForm from './LinkIncidentForm'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getRiskLevelStyles(level: string | null): { bg: string; color: string } {
  switch ((level ?? '').toLowerCase()) {
    case 'low':      return { bg: 'rgba(36,161,72,0.15)',  color: '#24a148' }
    case 'medium':   return { bg: 'rgba(241,194,27,0.15)', color: '#b08800' }
    case 'high':     return { bg: 'rgba(249,115,22,0.15)', color: '#c95000' }
    case 'critical': return { bg: 'rgba(218,30,40,0.15)',  color: '#da1e28' }
    default:         return { bg: '#f4f4f4',               color: '#525252' }
  }
}

function scoreToLevel(score: number | null): string | null {
  if (score == null) return null
  if (score <= 4)  return 'low'
  if (score <= 9)  return 'medium'
  if (score <= 16) return 'high'
  return 'critical'
}

function RiskLevelPill({ level }: { level: string | null }) {
  const { bg, color } = getRiskLevelStyles(level)
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.125rem 0.5rem',
      borderRadius: '2px',
      backgroundColor: bg,
      color,
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {level ?? '—'}
    </span>
  )
}

function getStatusTagType(status: string): 'gray' | 'blue' | 'teal' | 'purple' | 'red' | 'green' | 'cyan' {
  switch (status) {
    case 'active':       return 'green'
    case 'under_review': return 'purple'
    case 'closed':       return 'gray'
    case 'superseded':   return 'gray'
    default:             return 'gray'
  }
}

interface RiskScoreCardProps {
  label: string
  likelihood: number | null
  consequence: number | null
  score: number | null
  level: string | null
}

function RiskScoreCard({ label, likelihood, consequence, score, level }: RiskScoreCardProps) {
  const { color } = getRiskLevelStyles(level)
  return (
    <div style={{
      padding: '1.5rem',
      border: `2px solid ${color}`,
      borderRadius: '2px',
      backgroundColor: '#ffffff',
    }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '1rem' }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.25rem' }}>Likelihood</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>
            {likelihood ?? '—'}
          </p>
        </div>
        <p style={{ fontSize: '1.25rem', color: '#525252' }}>×</p>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.25rem' }}>Consequence</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>
            {consequence ?? '—'}
          </p>
        </div>
        <p style={{ fontSize: '1.25rem', color: '#525252' }}>=</p>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.25rem' }}>Score</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 600, color, lineHeight: 1 }}>
            {score ?? '—'}
          </p>
        </div>
      </div>
      {level && <RiskLevelPill level={level} />}
    </div>
  )
}

interface DetailRowProps {
  label: string
  value: React.ReactNode
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div style={{ display: 'flex', padding: '0.75rem 0', borderBottom: '1px solid #e0e0e0' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', width: '12rem', flexShrink: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: '0.875rem', color: '#525252', flex: 1 }}>
        {value ?? '—'}
      </p>
    </div>
  )
}

const HIERARCHY_LABELS: Record<string, string> = {
  elimination:    'Elimination',
  substitution:   'Substitution',
  engineering:    'Engineering',
  administrative: 'Administrative',
  ppe:            'PPE',
}

const HIERARCHY_COLORS: Record<string, { bg: string; color: string }> = {
  elimination:    { bg: 'rgba(36,161,72,0.12)',   color: '#1a7a38' },
  substitution:   { bg: 'rgba(0,115,198,0.10)',   color: '#0073c6' },
  engineering:    { bg: 'rgba(100,56,182,0.10)',   color: '#6438b6' },
  administrative: { bg: 'rgba(241,194,27,0.15)',  color: '#8a6800' },
  ppe:            { bg: 'rgba(218,30,40,0.10)',   color: '#a81620' },
}

export default async function RiskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: risk } = await supabase
    .from('risks')
    .select(`
      id, risk_number, title, hazard_description, location_activity,
      people_at_risk, likelihood_score, consequence_score,
      inherent_risk_score, inherent_risk_level,
      residual_likelihood_score, residual_consequence_score,
      residual_risk_score, residual_risk_level,
      residual_likelihood, residual_consequence,
      existing_controls_summary, owner_id, risk_owner_id, review_frequency,
      next_review_date, last_reviewed_at, status, source_type, notes,
      created_at, updated_at,
      risk_categories(name),
      user_profiles!risks_owner_id_fkey(first_name, last_name, display_name)
    `)
    .eq('id', id)
    .single()

  if (!risk) notFound()

  // Fetch risk controls (including hierarchy)
  const { data: controls } = await supabase
    .from('risk_controls')
    .select('id, control_type, control_hierarchy, description, is_implemented, assigned_to')
    .eq('risk_id', id)
    .order('created_at', { ascending: true })

  // Fetch risk owner profile (risk_owner_id — the dedicated owner field)
  let riskOwnerName = '—'
  const riskOwnerId = (risk as Record<string, unknown>).risk_owner_id as string | null
  if (riskOwnerId) {
    const { data: ownerProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, display_name')
      .eq('id', riskOwnerId)
      .single()
    if (ownerProfile) {
      riskOwnerName = ownerProfile.display_name ||
        `${ownerProfile.first_name ?? ''} ${ownerProfile.last_name ?? ''}`.trim() ||
        '—'
    }
  }

  // Fetch linked incidents
  const { data: linkedIncidents } = await supabase
    .from('risk_linked_incidents')
    .select('id, link_type, incidents(id, incident_number, title, status)')
    .eq('risk_id', id)

  const categoryRaw = risk.risk_categories as { name: string } | { name: string }[] | null
  const category = (Array.isArray(categoryRaw) ? categoryRaw[0]?.name : (categoryRaw as { name: string } | null)?.name) ?? '—'

  // Fallback owner from owner_id FK (legacy)
  const ownerRaw = risk.user_profiles as { first_name?: string; last_name?: string; display_name?: string } | { first_name?: string; last_name?: string; display_name?: string }[] | null
  const ownerProfile = Array.isArray(ownerRaw) ? (ownerRaw[0] ?? null) : ownerRaw
  const legacyOwnerName = ownerProfile
    ? (ownerProfile.display_name || `${ownerProfile.first_name ?? ''} ${ownerProfile.last_name ?? ''}`.trim())
    : null

  const displayOwnerName = riskOwnerName !== '—' ? riskOwnerName : (legacyOwnerName ?? '—')

  // Residual risk — prefer dedicated columns, fall back to residual_risk_score/level
  const residualLikelihood = (risk as Record<string, unknown>).residual_likelihood as number | null
    ?? risk.residual_likelihood_score
  const residualConsequence = (risk as Record<string, unknown>).residual_consequence as number | null
    ?? risk.residual_consequence_score
  const computedResidualScore = residualLikelihood != null && residualConsequence != null
    ? residualLikelihood * residualConsequence
    : risk.residual_risk_score
  const computedResidualLevel = computedResidualScore != null
    ? (scoreToLevel(computedResidualScore) ?? risk.residual_risk_level)
    : risk.residual_risk_level

  const hasResidual = residualLikelihood != null && residualConsequence != null

  return (
    <div style={{ padding: '2rem' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '1rem' }}>
        <BreadcrumbItem href="/risks">Risk Register</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{risk.risk_number ?? risk.id}</BreadcrumbItem>
      </Breadcrumb>

      {/* Page header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#525252', fontFamily: 'monospace' }}>
              {risk.risk_number ?? '—'}
            </p>
            <Tag type={getStatusTagType(risk.status)} size="sm">
              {risk.status.replace(/_/g, ' ')}
            </Tag>
            <RiskLevelPill level={risk.inherent_risk_level} />
            {hasResidual && computedResidualLevel && (
              <span style={{ fontSize: '0.75rem', color: '#525252' }}>
                Residual: <RiskLevelPill level={computedResidualLevel} />
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>{risk.title}</h1>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>
            Created {formatDate(risk.created_at)} · Last updated {formatDateTime(risk.updated_at)}
          </p>
          {displayOwnerName !== '—' && (
            <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.25rem' }}>
              Owner: <strong>{displayOwnerName}</strong>
            </p>
          )}
        </div>
        <a href={`/risks/${id}/edit`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none', whiteSpace: 'nowrap', marginTop: '0.5rem' }}>
          Edit
        </a>
      </div>

      <Grid condensed>
        {/* Left column — main content */}
        <Column sm={4} md={8} lg={12}>
          {/* Risk Matrix */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Risk Matrix</h2>
            </div>
            <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: hasResidual ? '1fr 1fr' : '1fr', gap: '1rem' }}>
              <RiskScoreCard
                label="Inherent Risk (Before Controls)"
                likelihood={risk.likelihood_score}
                consequence={risk.consequence_score}
                score={risk.inherent_risk_score}
                level={risk.inherent_risk_level}
              />
              {hasResidual && (
                <RiskScoreCard
                  label="Residual Risk (After Controls)"
                  likelihood={residualLikelihood}
                  consequence={residualConsequence}
                  score={computedResidualScore}
                  level={computedResidualLevel}
                />
              )}
            </div>
            {hasResidual && risk.inherent_risk_score != null && computedResidualScore != null && (
              <div style={{
                padding: '0.75rem 1.5rem',
                borderTop: '1px solid #e0e0e0',
                backgroundColor: '#f4f4f4',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
              }}>
                <span style={{ color: '#525252' }}>Risk reduction:</span>
                {computedResidualScore < risk.inherent_risk_score ? (
                  <span style={{ fontWeight: 600, color: '#24a148' }}>
                    ▼ {risk.inherent_risk_score - computedResidualScore} pts ({Math.round((1 - computedResidualScore / risk.inherent_risk_score) * 100)}% reduction)
                  </span>
                ) : computedResidualScore === risk.inherent_risk_score ? (
                  <span style={{ fontWeight: 600, color: '#525252' }}>No change</span>
                ) : (
                  <span style={{ fontWeight: 600, color: '#da1e28' }}>
                    ▲ {computedResidualScore - risk.inherent_risk_score} pts (increased)
                  </span>
                )}
              </div>
            )}
          </Tile>

          {/* Hazard Description */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Hazard Description</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#525252', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {risk.hazard_description}
              </p>
            </div>
          </Tile>

          {/* Existing Controls */}
          {risk.existing_controls_summary && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Existing Controls</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#525252', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {risk.existing_controls_summary}
                </p>
              </div>
            </Tile>
          )}

          {/* Control Measures */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Control Measures</h2>
              <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{(controls ?? []).length} controls</span>
            </div>
            {(controls ?? []).length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No control measures recorded
              </div>
            ) : (
              <div>
                {(controls ?? []).map((ctrl, i) => {
                  const hierarchyKey = ctrl.control_hierarchy ?? ''
                  const hierarchyStyle = HIERARCHY_COLORS[hierarchyKey] ?? { bg: '#f4f4f4', color: '#525252' }
                  return (
                    <div
                      key={ctrl.id}
                      style={{
                        padding: '1rem 1.5rem',
                        borderBottom: i < (controls ?? []).length - 1 ? '1px solid #e0e0e0' : 'none',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '2px',
                            backgroundColor: '#f4f4f4',
                            color: '#525252',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}>
                            {ctrl.control_type?.replace(/_/g, ' ') ?? 'Control'}
                          </span>
                          {ctrl.control_hierarchy && (
                            <span style={{
                              display: 'inline-block',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '2px',
                              backgroundColor: hierarchyStyle.bg,
                              color: hierarchyStyle.color,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}>
                              {HIERARCHY_LABELS[ctrl.control_hierarchy] ?? ctrl.control_hierarchy}
                            </span>
                          )}
                          {ctrl.is_implemented ? (
                            <span style={{ fontSize: '0.75rem', color: '#24a148', fontWeight: 600 }}>Implemented</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#da1e28', fontWeight: 600 }}>Not Implemented</span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#161616' }}>{ctrl.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Tile>

          {/* Linked Incidents */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Linked Incidents</h2>
              <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{(linkedIncidents ?? []).length} linked</span>
            </div>
            {(linkedIncidents ?? []).length === 0 ? (
              <div style={{ padding: '1.5rem 1.5rem 0', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No incidents linked to this risk
              </div>
            ) : (
              <div>
                {(linkedIncidents ?? []).map((link, i) => {
                  const incident = (link.incidents as unknown) as { id: string; incident_number: string; title: string; status: string } | { id: string; incident_number: string; title: string; status: string }[] | null
                  const inc = Array.isArray(incident) ? incident[0] ?? null : incident
                  if (!inc) return null
                  return (
                    <a
                      key={link.id}
                      href={`/incidents/${inc.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.875rem 1.5rem',
                        borderBottom: i < (linkedIncidents ?? []).length - 1 ? '1px solid #e0e0e0' : 'none',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f62fe' }}>
                          {inc.incident_number}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.125rem' }}>
                          {inc.title}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {link.link_type && (
                          <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                            {link.link_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
            {/* Link Incident inline form */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e0e0e0', backgroundColor: '#f4f4f4' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#525252', marginBottom: '0.5rem' }}>
                Link an Incident
              </p>
              <LinkIncidentForm riskId={id} />
            </div>
          </Tile>

          {/* Notes */}
          {risk.notes && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Notes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#525252', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {risk.notes}
                </p>
              </div>
            </Tile>
          )}
        </Column>

        {/* Right column — metadata */}
        <Column sm={4} md={8} lg={4}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Details</h2>
            </div>
            <div style={{ padding: '0 1.5rem 1rem' }}>
              <DetailRow label="Category" value={category} />
              <DetailRow label="Location / Activity" value={risk.location_activity} />
              <DetailRow
                label="People at Risk"
                value={
                  risk.people_at_risk && risk.people_at_risk.length > 0
                    ? risk.people_at_risk.join(', ')
                    : '—'
                }
              />
              <DetailRow label="Risk Owner" value={displayOwnerName} />
              <DetailRow
                label="Review Frequency"
                value={<span style={{ textTransform: 'capitalize' }}>{risk.review_frequency}</span>}
              />
              <DetailRow label="Next Review" value={formatDate(risk.next_review_date)} />
              <DetailRow label="Last Reviewed" value={formatDateTime(risk.last_reviewed_at)} />
              <DetailRow label="Source Type" value={<span style={{ textTransform: 'capitalize' }}>{risk.source_type.replace(/_/g, ' ')}</span>} />
            </div>
          </Tile>

          {/* Residual Risk Summary card in sidebar */}
          {hasResidual && computedResidualScore != null && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Residual Risk</h2>
              </div>
              <div style={{ padding: '1rem 1.5rem' }}>
                {(() => {
                  const { bg, color } = getRiskLevelStyles(computedResidualLevel)
                  return (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: bg,
                      borderRadius: '2px',
                      border: `1px solid ${color}44`,
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem' }}>Score after controls</p>
                      <p style={{ fontSize: '2.5rem', fontWeight: 300, color, lineHeight: 1, marginBottom: '0.5rem' }}>
                        {computedResidualScore}
                      </p>
                      <RiskLevelPill level={computedResidualLevel} />
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.5rem' }}>
                        {residualLikelihood} likelihood × {residualConsequence} consequence
                      </p>
                    </div>
                  )
                })()}
              </div>
            </Tile>
          )}
        </Column>
      </Grid>
    </div>
  )
}
