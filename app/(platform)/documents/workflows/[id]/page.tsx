import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { NewButton } from '@/components/ui/NewButton'

interface PageProps {
  params: Promise<{ id: string }>
}

const STEP_TYPE_TAG: Record<string, { type: 'blue' | 'teal' | 'gray'; label: string }> = {
  reviewer: { type: 'blue', label: 'Reviewer' },
  approver: { type: 'teal', label: 'Approver' },
  notified: { type: 'gray', label: 'Notified' },
}

export default async function WorkflowDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: workflow } = await supabase
    .from('document_review_workflows')
    .select('id, name, description, is_default, is_active, created_at')
    .eq('id', id)
    .single()

  if (!workflow) notFound()

  const { data: steps } = await supabase
    .from('document_review_workflow_steps')
    .select('id, order_index, step_name, step_type, assigned_role_id')
    .eq('workflow_id', id)
    .order('order_index', { ascending: true })

  // Fetch role names for the steps that have one
  const roleIds = (steps ?? [])
    .map((s) => s.assigned_role_id)
    .filter((rid): rid is string => !!rid)

  const roleMap: Record<string, string> = {}
  if (roleIds.length > 0) {
    const { data: roles } = await supabase
      .from('roles')
      .select('id, name')
      .in('id', roleIds)
    for (const r of roles ?? []) {
      roleMap[r.id] = r.name
    }
  }

  // Count documents using this workflow
  const { count: documentCount } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('review_workflow_id', id)

  const docCount = documentCount ?? 0

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/documents">Documents</BreadcrumbItem>
        <BreadcrumbItem href="/documents/workflows">Review Workflows</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{workflow.name}</BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 400,
                color: '#161616',
                marginRight: '0.25rem',
              }}
            >
              {workflow.name}
            </h1>
            {workflow.is_default && <Tag type="teal">Default</Tag>}
            <Tag type={workflow.is_active ? 'green' : 'gray'}>
              {workflow.is_active ? 'Active' : 'Inactive'}
            </Tag>
          </div>
          {workflow.description && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#525252' }}>
              {workflow.description}
            </p>
          )}
        </div>
        <NewButton
          href={`/documents/workflows/${id}/edit`}
          label="Edit Workflow"
          kind="secondary"
        />
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={10}>
          {/* Steps tile */}
          <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Review Steps
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {(!steps || steps.length === 0) ? (
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>
                  No steps configured for this workflow.
                </p>
              ) : (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {steps.map((step, index) => {
                    const typeConfig = STEP_TYPE_TAG[step.step_type] ?? { type: 'gray' as const, label: step.step_type }
                    const roleName = step.assigned_role_id ? roleMap[step.assigned_role_id] : null
                    return (
                      <li
                        key={step.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          paddingBottom: index < steps.length - 1 ? '1rem' : 0,
                          marginBottom: index < steps.length - 1 ? '1rem' : 0,
                          borderBottom:
                            index < steps.length - 1 ? '1px solid #e0e0e0' : 'none',
                        }}
                      >
                        {/* Step number badge */}
                        <div
                          style={{
                            flexShrink: 0,
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '50%',
                            background: '#0f62fe',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {index + 1}
                        </div>

                        {/* Step name */}
                        <span
                          style={{
                            flex: 1,
                            fontSize: '0.875rem',
                            color: '#161616',
                            fontWeight: 500,
                          }}
                        >
                          {step.step_name}
                        </span>

                        {/* Step type tag */}
                        <Tag type={typeConfig.type}>{typeConfig.label}</Tag>

                        {/* Role */}
                        {roleName ? (
                          <span style={{ fontSize: '0.75rem', color: '#525252' }}>
                            {roleName}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                            Any role
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </Tile>

          {/* Documents using this workflow */}
          <Tile style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              <span style={{ fontWeight: 600, color: '#161616' }}>{docCount}</span>{' '}
              document{docCount !== 1 ? 's' : ''} use this workflow.
            </p>
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
