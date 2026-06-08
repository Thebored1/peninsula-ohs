import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Tile, Tag } from '@carbon/react'
import Link from 'next/link'

interface PageProps { params: Promise<{ id: string }> }

const TYPE_LABELS: Record<string, string> = {
  offer_letter: 'Letter of Offer', employment_contract: 'Employment Contract',
  nda: 'Non-Disclosure Agreement', policy_acknowledgement: 'Policy Acknowledgement',
  probation_notice: 'Probation Notice', custom: 'Custom',
}

export default async function HrTemplateDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data: template } = await supabase
    .from('hr_document_templates')
    .select('*')
    .eq('id', id)
    .or(`organisation_id.is.null,organisation_id.eq.${orgId}`)
    .single()

  if (!template) notFound()

  const provinceClauses = (template.province_clauses ?? {}) as Record<string, string>
  const isEditable = !template.is_system_template

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/hiring">Hiring</BreadcrumbItem>
        <BreadcrumbItem href="/hiring/templates">Document Templates</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{template.name}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>{template.name}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Tag type={template.is_system_template ? 'blue' : 'gray'} size="sm">
              {template.is_system_template ? 'System Template' : 'Custom Template'}
            </Tag>
            <Tag type="gray" size="sm">{TYPE_LABELS[template.template_type] ?? template.template_type}</Tag>
            <Tag type={template.is_active ? 'green' : 'gray'} size="sm">{template.is_active ? 'Active' : 'Inactive'}</Tag>
            <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>v{template.version}</span>
          </div>
        </div>
        {isEditable && (
          <Link href={`/hiring/templates/${id}/edit`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>Edit</Link>
        )}
      </div>

      {template.description && (
        <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '2rem' }}>{template.description}</p>
      )}

      <Tile style={{ padding: 0, marginBottom: '1rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Template Content</h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <pre style={{ fontSize: '0.8125rem', color: '#161616', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-ibm-plex-mono, monospace)', lineHeight: 1.6, backgroundColor: '#f4f4f4', padding: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
            {template.body_content}
          </pre>
        </div>
      </Tile>

      {Object.keys(provinceClauses).length > 0 && (
        <Tile style={{ padding: 0, marginBottom: '1rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Province-Specific Clauses</h2>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {Object.entries(provinceClauses).map(([province, clause]) => (
              <div key={province} style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#161616', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{province}</p>
                <pre style={{ fontSize: '0.8125rem', color: '#525252', whiteSpace: 'pre-wrap', lineHeight: 1.6, backgroundColor: '#f4f4f4', padding: '0.75rem' }}>
                  {clause}
                </pre>
              </div>
            ))}
          </div>
        </Tile>
      )}

      {isEditable && template.is_system_template === false && (
        <Tile style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Variable Fields</h2>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '0.8125rem', color: '#525252' }}>
              Scan the body content above for <code>{'{{variable_name}}'}</code> tokens. These will be automatically substituted when generating a document for a hire.
            </p>
          </div>
        </Tile>
      )}
    </div>
  )
}
