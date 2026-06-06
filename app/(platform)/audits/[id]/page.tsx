import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem, Button,
  Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer,
} from '@carbon/react'
import { updateAuditStatus, deleteAudit } from '@/app/actions/audits'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    planned: 'blue', in_progress: 'teal', findings_review: 'purple',
    report_draft: 'cyan', completed: 'green', cancelled: 'gray',
  }
  return map[status] ?? 'gray'
}

function outcomeTag(code: string): TagType {
  const map: Record<string, TagType> = {
    conformance: 'green', minor_nc: 'teal', major_nc: 'red',
    observation: 'blue', opportunity_for_improvement: 'purple', not_applicable: 'gray',
  }
  return map[code] ?? 'gray'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
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

export default async function AuditDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: audit } = await supabase
    .from('audits')
    .select(`
      id, audit_number, title, status, scope, objectives, standard_reference,
      planned_start_date, planned_end_date, actual_start_date, actual_end_date,
      report_due_date, executive_summary, notes,
      total_criteria, assessed_criteria, conformance_count,
      minor_nc_count, major_nc_count, observation_count, ofi_count,
      lead_auditor_id, created_at,
      audit_types(name),
      audit_templates(name)
    `)
    .eq('id', id)
    .single()

  if (!audit) notFound()

  let leadAuditorName: string | null = null
  if (audit.lead_auditor_id) {
    const { data: la } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', audit.lead_auditor_id)
      .single()
    if (la) leadAuditorName = `${la.first_name} ${la.last_name}`
  }

  // Sections + criteria + findings
  const { data: sections } = await supabase
    .from('audit_sections')
    .select('id, title, order_index')
    .eq('audit_id', id)
    .order('order_index')

  const { data: criteria } = await supabase
    .from('audit_criteria')
    .select('id, section_id, reference_number, criterion_text, order_index')
    .eq('audit_id', id)
    .order('order_index')

  const { data: findings } = await supabase
    .from('audit_findings')
    .select(`
      id, criterion_id, finding_text, recommendation, assessed_at,
      audit_finding_outcomes(code, name, colour_code, requires_action)
    `)
    .eq('audit_id', id)

  // CAPA actions linked to findings
  const { data: findingActions } = await supabase
    .from('audit_finding_actions')
    .select(`
      id, finding_id,
      actions(id, action_number, title, status)
    `)
    .eq('audit_id', id)

  const typeRaw = audit.audit_types
  const tplRaw = audit.audit_templates
  const type = Array.isArray(typeRaw) ? typeRaw[0] ?? null : typeRaw
  const tpl = Array.isArray(tplRaw) ? tplRaw[0] ?? null : tplRaw

  const findingMap = new Map((findings ?? []).map(f => [f.criterion_id, f]))
  const sectionCriteria = new Map<string | null, typeof criteria>()
  sectionCriteria.set(null, [])
  for (const s of sections ?? []) sectionCriteria.set(s.id, [])
  for (const c of criteria ?? []) {
    const key = c.section_id ?? null
    if (!sectionCriteria.has(key)) sectionCriteria.set(key, [])
    sectionCriteria.get(key)!.push(c)
  }

  const canAssess = !['completed', 'cancelled'].includes(audit.status)
  const canComplete = audit.status === 'findings_review'
  const canStart = audit.status === 'planned'

  async function handleStart() { 'use server'; await updateAuditStatus(id, 'in_progress') }
  async function handleFindingsReview() { 'use server'; await updateAuditStatus(id, 'findings_review') }
  async function handleComplete() { 'use server'; await updateAuditStatus(id, 'completed') }
  async function handleCancel() { 'use server'; await updateAuditStatus(id, 'cancelled') }
  async function handleDelete() { 'use server'; await deleteAudit(id) }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/audits">Audits</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{audit.audit_number ?? id.slice(0, 8)}</BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            {audit.audit_number ?? '—'}
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>{audit.title}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Tag type={statusTag(audit.status)} size="md">{audit.status?.replace(/_/g, ' ')}</Tag>
            {(type as { name: string } | null)?.name && (
              <Tag type="blue" size="md">{(type as { name: string }).name}</Tag>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
          {canAssess && (
            <Button kind="primary" href={`/audits/${id}/assess`} size="sm">Record Findings</Button>
          )}
          {canStart && (
            <form action={handleStart}>
              <Button type="submit" kind="secondary" size="sm">Start Audit</Button>
            </form>
          )}
          {audit.status === 'in_progress' && (
            <form action={handleFindingsReview}>
              <Button type="submit" kind="secondary" size="sm">Move to Findings Review</Button>
            </form>
          )}
          {canComplete && (
            <form action={handleComplete}>
              <Button type="submit" kind="secondary" size="sm">Complete Audit</Button>
            </form>
          )}
          {!['completed', 'cancelled'].includes(audit.status) && (
            <form action={handleCancel}>
              <Button type="submit" kind="danger--ghost" size="sm">Cancel</Button>
            </form>
          )}
        </div>
      </div>

      <Grid condensed>
        {/* Left: details + findings */}
        <Column sm={4} md={8} lg={10}>
          {/* Details */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Audit Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Type">{(type as { name: string } | null)?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Template">{(tpl as { name: string } | null)?.name ?? 'Ad-hoc'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Lead Auditor">{leadAuditorName ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Standard">{audit.standard_reference ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Planned Start">{formatDate(audit.planned_start_date)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Planned End">{formatDate(audit.planned_end_date)}</DetailRow>
                </Column>
                {audit.actual_start_date && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Actual Start">{formatDate(audit.actual_start_date)}</DetailRow>
                  </Column>
                )}
                {audit.actual_end_date && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Actual End">{formatDate(audit.actual_end_date)}</DetailRow>
                  </Column>
                )}
              </Grid>
              {audit.scope && (
                <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                  <DetailRow label="Scope">{audit.scope}</DetailRow>
                </div>
              )}
              {audit.objectives && <DetailRow label="Objectives">{audit.objectives}</DetailRow>}
            </div>
          </Tile>

          {/* Criteria + findings by section */}
          {(criteria ?? []).length > 0 && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Criteria & Findings ({audit.assessed_criteria}/{audit.total_criteria} assessed)
                </h2>
                {canAssess && (
                  <a href={`/audits/${id}/assess`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
                    Record findings
                  </a>
                )}
              </div>
              <div style={{ padding: '1rem 1.5rem' }}>
                {(sections ?? []).length > 0 ? (
                  (sections ?? []).map(sec => {
                    const secCriteria = sectionCriteria.get(sec.id) ?? []
                    return (
                      <div key={sec.id} style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f62fe', marginBottom: '0.75rem', paddingBottom: '0.25rem', borderBottom: '1px solid #e0e0e0' }}>
                          {sec.title}
                        </h3>
                        {secCriteria.map(c => <CriterionRow key={c.id} criterion={c} finding={findingMap.get(c.id) ?? null} outcomeTag={outcomeTag} />)}
                      </div>
                    )
                  })
                ) : (
                  (criteria ?? []).map(c => <CriterionRow key={c.id} criterion={c} finding={findingMap.get(c.id) ?? null} outcomeTag={outcomeTag} />)
                )}
              </div>
            </Tile>
          )}

          {audit.executive_summary && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Executive Summary</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{audit.executive_summary}</p>
              </div>
            </Tile>
          )}
        </Column>

        {/* Right: stats + actions */}
        <Column sm={4} md={8} lg={6}>
          {/* Findings summary */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Findings Summary</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                {[
                  { label: 'Total Criteria', value: audit.total_criteria, color: '#161616' },
                  { label: 'Assessed', value: audit.assessed_criteria, color: '#161616' },
                  { label: 'Conformance', value: audit.conformance_count, color: '#24a148' },
                  { label: 'Minor NC', value: audit.minor_nc_count, color: '#f1c21b' },
                  { label: 'Major NC', value: audit.major_nc_count, color: '#da1e28' },
                  { label: 'Observations', value: audit.observation_count, color: '#0f62fe' },
                  { label: 'OFIs', value: audit.ofi_count, color: '#8a3ffc' },
                ].map(s => (
                  <Column key={s.label} sm={2} md={2} lg={4}>
                    <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 300, color: s.color }}>{s.value}</p>
                      <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{s.label}</p>
                    </div>
                  </Column>
                ))}
              </Grid>
            </div>
          </Tile>

          {/* CAPA Actions */}
          {(findingActions ?? []).length > 0 && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>CAPA Actions</h2>
              </div>
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Action #</TableHeader>
                      <TableHeader>Title</TableHeader>
                      <TableHeader>Status</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(findingActions ?? []).map(fa => {
                      const aRaw = fa.actions
                      const a = Array.isArray(aRaw) ? aRaw[0] ?? null : aRaw
                      if (!a) return null
                      const action = a as { id: string; action_number: string | null; title: string; status: string }
                      return (
                        <TableRow key={fa.id}>
                          <TableCell><span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{action.action_number ?? '—'}</span></TableCell>
                          <TableCell><a href={`/actions/${action.id}`} style={{ color: '#0f62fe', textDecoration: 'none', fontSize: '0.8125rem' }}>{action.title}</a></TableCell>
                          <TableCell><Tag type="blue" size="sm">{action.status?.replace(/_/g, ' ')}</Tag></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Tile>
          )}

          {/* Delete (if no findings) */}
          {audit.status === 'planned' && (audit.assessed_criteria ?? 0) === 0 && (
            <Tile style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>Danger Zone</h2>
              <form action={handleDelete}>
                <Button type="submit" kind="danger" size="sm">Delete Audit</Button>
              </form>
            </Tile>
          )}
        </Column>
      </Grid>
    </div>
  )
}

function CriterionRow({
  criterion,
  finding,
  outcomeTag,
}: {
  criterion: { id: string; reference_number: string | null; criterion_text: string }
  finding: {
    finding_text: string | null
    recommendation: string | null
    audit_finding_outcomes: { code: string; name: string; colour_code: string } | { code: string; name: string; colour_code: string }[] | null
  } | null
  outcomeTag: (code: string) => 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'
}) {
  const outcomeRaw = finding?.audit_finding_outcomes
  const outcome = outcomeRaw
    ? Array.isArray(outcomeRaw) ? outcomeRaw[0] ?? null : outcomeRaw
    : null

  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #f4f4f4', alignItems: 'flex-start' }}>
      {criterion.reference_number && (
        <span style={{ fontSize: '0.75rem', color: '#6f6f6f', minWidth: '2.5rem', paddingTop: '0.125rem', fontFamily: 'monospace' }}>
          {criterion.reference_number}
        </span>
      )}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: finding?.finding_text ? '0.25rem' : 0 }}>
          {criterion.criterion_text}
        </p>
        {finding?.finding_text && (
          <p style={{ fontSize: '0.8125rem', color: '#525252' }}>{finding.finding_text}</p>
        )}
      </div>
      {outcome ? (
        <Tag type={outcomeTag(outcome.code)} size="sm">{outcome.name}</Tag>
      ) : (
        <Tag type="gray" size="sm">Not assessed</Tag>
      )}
    </div>
  )
}
