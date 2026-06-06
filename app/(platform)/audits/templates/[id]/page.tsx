import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem, Button } from '@carbon/react'
import { publishAuditTemplate, unpublishAuditTemplate, deleteAuditTemplate } from '@/app/actions/audit-templates'

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{label}</p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps { params: Promise<{ id: string }> }

export default async function AuditTemplateDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: template } = await supabase
    .from('audit_templates')
    .select(`id, name, description, standard_reference, version, is_published, is_active, created_at, audit_types(name)`)
    .eq('id', id)
    .single()

  if (!template) notFound()

  const { data: sections } = await supabase
    .from('audit_template_sections')
    .select('id, title, order_index')
    .eq('template_id', id)
    .order('order_index')

  const { data: criteria } = await supabase
    .from('audit_template_criteria')
    .select('id, section_id, reference_number, criterion_text, guidance, evidence_required, order_index')
    .eq('template_id', id)
    .eq('is_active', true)
    .order('order_index')

  const { count: auditCount } = await supabase
    .from('audits')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', id)

  const typeRaw = template.audit_types
  const type = Array.isArray(typeRaw) ? typeRaw[0] ?? null : typeRaw

  const sectionMap = new Map<string | null, typeof criteria>()
  sectionMap.set(null, [])
  for (const s of sections ?? []) sectionMap.set(s.id, [])
  for (const c of criteria ?? []) {
    const key = c.section_id ?? null
    if (!sectionMap.has(key)) sectionMap.set(key, [])
    sectionMap.get(key)!.push(c)
  }

  async function handlePublish() { 'use server'; await publishAuditTemplate(id) }
  async function handleUnpublish() { 'use server'; await unpublishAuditTemplate(id) }
  async function handleDelete() { 'use server'; await deleteAuditTemplate(id) }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/audits">Audits</BreadcrumbItem>
        <BreadcrumbItem href="/audits/templates">Templates</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{template.name}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>v{template.version}</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>{template.name}</h1>
          <Tag type={template.is_published ? 'green' : 'gray'} size="md">{template.is_published ? 'Published' : 'Draft'}</Tag>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!template.is_published ? (
            <form action={handlePublish}><Button type="submit" kind="primary" size="sm">Publish</Button></form>
          ) : (
            <form action={handleUnpublish}><Button type="submit" kind="secondary" size="sm">Unpublish</Button></form>
          )}
          {(auditCount ?? 0) === 0 && (
            <form action={handleDelete}><Button type="submit" kind="danger--ghost" size="sm">Delete</Button></form>
          )}
        </div>
      </div>

      <Grid condensed>
        <Column sm={4} md={3} lg={5}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <DetailRow label="Audit Type">{(type as { name: string } | null)?.name ?? '—'}</DetailRow>
              <DetailRow label="Standard">{template.standard_reference ?? '—'}</DetailRow>
              <DetailRow label="Total Criteria">{(criteria ?? []).length}</DetailRow>
              <DetailRow label="Audits Using This">{auditCount ?? 0}</DetailRow>
              {template.description && <DetailRow label="Description">{template.description}</DetailRow>}
            </div>
          </Tile>
        </Column>

        <Column sm={4} md={5} lg={11}>
          <Tile style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Criteria ({(criteria ?? []).length})</h2>
            </div>
            {(criteria ?? []).length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No criteria added.
              </div>
            ) : (
              <div style={{ padding: '1rem 1.5rem' }}>
                {(sections ?? []).length > 0 ? (
                  (sections ?? []).map(sec => {
                    const secCriteria = sectionMap.get(sec.id) ?? []
                    return (
                      <div key={sec.id} style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f62fe', marginBottom: '0.75rem', paddingBottom: '0.25rem', borderBottom: '1px solid #e0e0e0' }}>
                          {sec.title}
                        </h3>
                        {secCriteria.map((c, i) => <CriterionItem key={c.id} index={i + 1} criterion={c} />)}
                      </div>
                    )
                  })
                ) : (
                  (criteria ?? []).map((c, i) => <CriterionItem key={c.id} index={i + 1} criterion={c} />)
                )}
              </div>
            )}
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}

function CriterionItem({ index, criterion }: { index: number; criterion: { reference_number: string | null; criterion_text: string; guidance: string | null; evidence_required: string | null } }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #f4f4f4' }}>
      {criterion.reference_number && (
        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#6f6f6f', minWidth: '2.5rem', paddingTop: '0.125rem' }}>
          {criterion.reference_number}
        </span>
      )}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: criterion.guidance ? '0.25rem' : 0 }}>
          <span style={{ color: '#6f6f6f', marginRight: '0.5rem', fontSize: '0.75rem' }}>{index}.</span>
          {criterion.criterion_text}
        </p>
        {criterion.guidance && <p style={{ fontSize: '0.8125rem', color: '#6f6f6f' }}>{criterion.guidance}</p>}
        {criterion.evidence_required && (
          <p style={{ fontSize: '0.8125rem', color: '#525252', marginTop: '0.125rem' }}>
            Evidence: {criterion.evidence_required}
          </p>
        )}
      </div>
    </div>
  )
}
