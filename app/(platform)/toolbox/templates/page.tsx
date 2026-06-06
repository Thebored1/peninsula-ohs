import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Breadcrumb, BreadcrumbItem, Tag } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

export default async function ToolboxTemplatesPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('toolbox_talk_templates')
    .select(`
      id, title, description, estimated_duration_minutes, is_active, created_at,
      toolbox_talk_categories(name, colour_code)
    `)
    .eq('organisation_id', orgId)
    .order('title')

  const rows = (data ?? []).map(r => {
    const catRaw = r.toolbox_talk_categories
    const cat = Array.isArray(catRaw)
      ? (catRaw[0] as { name: string; colour_code: string } | undefined)
      : (catRaw as { name: string; colour_code: string } | null)
    return {
      id: r.id,
      title: r.title,
      category_colour: cat?.colour_code ?? '#525252',
      category: cat?.name ?? '—',
      duration: r.estimated_duration_minutes ? `${r.estimated_duration_minutes} min` : '—',
      is_active: r.is_active,
      created_at: r.created_at,
    }
  })

  const columns: ColDef[] = [
    { key: 'title', header: 'Title', cellConfig: { as: 'text_link', prefix: '/toolbox/templates/' } },
    {
      key: 'category',
      header: 'Category',
      cellConfig: { as: 'dot_text', colourField: 'category_colour' },
    },
    { key: 'duration', header: 'Duration' },
    {
      key: 'is_active',
      header: 'Status',
      cellConfig: {
        as: 'bool_tag',
        trueType: 'green',
        trueLabel: 'Active',
        falseType: 'gray',
        falseLabel: 'Inactive',
      },
    },
    { key: 'created_at', header: 'Created', cellConfig: { as: 'date' } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/toolbox/templates/' } },
  ]

  const active = rows.filter(r => r.is_active).length

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.25rem' }}>
        <BreadcrumbItem href="/toolbox">Toolbox Talks</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Templates</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Talk Templates
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {active} active template{active !== 1 ? 's' : ''} — {rows.length} total
          </p>
        </div>
        <NewButton href="/toolbox/templates/new" label="New Template" />
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No templates yet.{' '}
            <a href="/toolbox/templates/new" style={{ color: '#0f62fe', textDecoration: 'none' }}>
              Create the first template
            </a>.
          </div>
        ) : (
          <DataTableClient
            id="templates-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search templates…"
          />
        )}
      </Tile>
    </div>
  )
}
