import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Tag } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

export default async function HrTemplatesPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('hr_document_templates')
    .select('id, name, template_type, description, is_system_template, is_active, version')
    .or(`organisation_id.is.null,organisation_id.eq.${orgId}`)
    .order('is_system_template', { ascending: false })
    .order('name')

  const rows = (data ?? []).map(t => ({
    id: t.id,
    source: t.is_system_template ? 'System' : 'Custom',
    name: t.name,
    template_type: t.template_type,
    version: t.version,
    is_active: t.is_active,
  }))

  const columns: ColDef[] = [
    { key: 'source', header: 'Source', cellConfig: { as: 'tag', map: { System: 'blue', Custom: 'gray' } } },
    { key: 'name', header: 'Template Name' },
    { key: 'template_type', header: 'Type', cellConfig: { as: 'tag', map: { offer_letter: 'blue', employment_contract: 'teal', nda: 'purple', policy_acknowledgement: 'cyan', probation_notice: 'gray', custom: 'gray' }, transform: true } },
    { key: 'version', header: 'Version' },
    { key: 'is_active', header: 'Active', cellConfig: { as: 'bool_tag', trueType: 'green', trueLabel: 'Active', falseType: 'gray', falseLabel: 'Inactive' } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/hiring/templates/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>HR Document Templates</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {(data ?? []).filter(t => t.is_system_template).length} system · {(data ?? []).filter(t => !t.is_system_template).length} custom
          </p>
        </div>
        <NewButton href="/hiring/templates/new" label="New Template" />
      </div>
      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>No templates found</div>
        ) : (
          <DataTableClient id="hr-templates-table" rows={rows} columns={columns} searchPlaceholder="Search templates…" />
        )}
      </Tile>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '1rem' }}>
        <Tag type="blue" size="sm">System</Tag>{' '}templates are EXXIO-managed. <Tag type="gray" size="sm">Custom</Tag>{' '}templates are created by your organisation.
      </p>
    </div>
  )
}
