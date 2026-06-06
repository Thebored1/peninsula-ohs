import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

const columns: ColDef[] = [
  {
    key: 'name',
    header: 'Name',
    cellConfig: { as: 'text_link', prefix: '/documents/workflows/' },
  },
  {
    key: 'is_default',
    header: 'Default',
    cellConfig: {
      as: 'bool_tag',
      trueType: 'teal',
      trueLabel: 'Default',
      falseType: 'gray',
      falseLabel: 'No',
    },
  },
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
  {
    key: 'step_count',
    header: 'Steps',
  },
]

export default async function WorkflowsPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data: workflows } = orgId
    ? await supabase
        .from('document_review_workflows')
        .select('id, name, description, is_default, is_active, created_at, document_review_workflow_steps(count)')
        .eq('organisation_id', orgId)
        .order('created_at', { ascending: false })
    : { data: [] }

  const rows = (workflows ?? []).map((w) => {
    const stepsRaw = w.document_review_workflow_steps
    let stepCount = 0
    if (Array.isArray(stepsRaw) && stepsRaw.length > 0) {
      const first = stepsRaw[0] as { count: number } | undefined
      stepCount = first?.count ?? 0
    }
    return {
      id: w.id,
      name: w.name,
      is_default: w.is_default ?? false,
      is_active: w.is_active ?? true,
      step_count: stepCount,
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.25rem',
            }}
          >
            Review Workflows
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} workflow{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NewButton href="/documents/workflows/new" label="New Workflow" />
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              color: '#6f6f6f',
              fontSize: '0.875rem',
            }}
          >
            No review workflows
          </div>
        ) : (
          <DataTableClient
            id="workflows-table"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search workflows…"
          />
        )}
      </Tile>
    </div>
  )
}
