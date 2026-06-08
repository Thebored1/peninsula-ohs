import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

export default async function OnboardingTemplatesPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data: templates } = await supabase
    .from('onboarding_templates')
    .select('id, name, description, employment_types, is_active')
    .eq('organisation_id', orgId)
    .order('name')

  // Count tasks per template
  const templateIds = (templates ?? []).map(t => t.id)
  const taskCounts: Record<string, number> = {}
  if (templateIds.length > 0) {
    const { data: tasks } = await supabase
      .from('onboarding_template_tasks')
      .select('template_id')
      .in('template_id', templateIds)
    for (const t of tasks ?? []) {
      taskCounts[t.template_id] = (taskCounts[t.template_id] ?? 0) + 1
    }
  }

  const rows = (templates ?? []).map(t => ({
    id: t.id,
    name: t.name,
    employment_types: t.employment_types ? t.employment_types.join(', ') : 'All',
    task_count: taskCounts[t.id] ?? 0,
    is_active: t.is_active,
  }))

  const columns: ColDef[] = [
    { key: 'name', header: 'Template Name' },
    { key: 'employment_types', header: 'Employment Types' },
    { key: 'task_count', header: 'Tasks' },
    { key: 'is_active', header: 'Active', cellConfig: { as: 'bool_tag', trueType: 'green', trueLabel: 'Active', falseType: 'gray', falseLabel: 'Inactive' } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/hiring/onboarding/templates/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Onboarding Templates</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {(templates ?? []).length} template{(templates ?? []).length !== 1 ? 's' : ''} defined
          </p>
        </div>
        <NewButton href="/hiring/onboarding/templates/new" label="New Template" />
      </div>
      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No onboarding templates yet. Create one to auto-assign checklists when hires complete.
          </div>
        ) : (
          <DataTableClient id="onboarding-templates-table" rows={rows} columns={columns} searchPlaceholder="Search templates…" />
        )}
      </Tile>
    </div>
  )
}
