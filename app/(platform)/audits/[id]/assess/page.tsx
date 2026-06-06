import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { AssessForm } from './AssessForm'
import { saveFindings } from '@/app/actions/audits'

interface PageProps { params: Promise<{ id: string }> }

export default async function AssessAuditPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: audit } = await supabase
    .from('audits')
    .select('id, audit_number, title, status, audit_types(name)')
    .eq('id', id)
    .single()

  if (!audit) notFound()
  if (['completed', 'cancelled'].includes(audit.status)) redirect(`/audits/${id}`)

  // Sections
  const { data: sections } = await supabase
    .from('audit_sections')
    .select('id, title, order_index')
    .eq('audit_id', id)
    .order('order_index')

  // Criteria
  const { data: criteria } = await supabase
    .from('audit_criteria')
    .select('id, section_id, reference_number, criterion_text, guidance, evidence_required, order_index')
    .eq('audit_id', id)
    .order('order_index')

  // Existing findings
  const { data: existingFindings } = await supabase
    .from('audit_findings')
    .select('criterion_id, outcome_id, finding_text, recommendation, root_cause, objective_evidence')
    .eq('audit_id', id)

  // Outcomes lookup
  const { data: outcomes } = await supabase
    .from('audit_finding_outcomes')
    .select('id, code, name, colour_code, requires_action, is_nonconformance')
    .eq('is_active', true)
    .order('display_order')

  type FindingRow = NonNullable<typeof existingFindings>[number]
  const findingMap: Record<string, FindingRow> = {}
  for (const f of existingFindings ?? []) findingMap[f.criterion_id] = f

  const tplRaw = audit.audit_types
  const type = Array.isArray(tplRaw) ? tplRaw[0] ?? null : tplRaw

  // Group criteria by section
  type CriterionRow = NonNullable<typeof criteria>[number]
  type AuditSection = { id: string | null; title: string | null; order: number; criteria: CriterionRow[] }
  const sectionMap = new Map<string | null, AuditSection>()
  sectionMap.set(null, { id: null, title: null, order: 999, criteria: [] })
  for (const s of sections ?? []) sectionMap.set(s.id, { id: s.id, title: s.title, order: s.order_index, criteria: [] })
  for (const c of criteria ?? []) {
    const key = c.section_id ?? null
    if (!sectionMap.has(key)) sectionMap.set(key, { id: key, title: null, order: 999, criteria: [] })
    sectionMap.get(key)!.criteria.push(c)
  }
  const orderedSections = Array.from(sectionMap.values())
    .filter(s => s.criteria.length > 0)
    .sort((a, b) => a.order - b.order)

  async function handleSave(auditId: string, findings: Parameters<typeof saveFindings>[1]) {
    'use server'
    return saveFindings(auditId, findings)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/audits">Audits</BreadcrumbItem>
        <BreadcrumbItem href={`/audits/${id}`}>{audit.audit_number ?? id.slice(0, 8)}</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Record Findings</BreadcrumbItem>
      </Breadcrumb>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.5rem' }}>
        {audit.title}
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '2rem' }}>
        {(type as { name: string } | null)?.name ?? ''} · {(criteria ?? []).length} criteria
      </p>
      <AssessForm
        auditId={id}
        sections={orderedSections}
        outcomes={outcomes ?? []}
        findingMap={findingMap}
        saveAction={handleSave}
        returnUrl={`/audits/${id}`}
      />
    </div>
  )
}
