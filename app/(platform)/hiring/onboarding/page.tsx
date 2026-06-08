import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import Link from 'next/link'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data: assignments } = await supabase
    .from('onboarding_assignments')
    .select('id, status, start_date, target_completion_date, completed_at, user_profiles!worker_id(first_name, last_name), onboarding_templates!template_id(name)')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Count tasks per assignment
  const assignmentIds = (assignments ?? []).map(a => a.id)
  let taskCounts: Record<string, { total: number; done: number }> = {}
  if (assignmentIds.length > 0) {
    const { data: taskData } = await supabase
      .from('onboarding_task_completions')
      .select('assignment_id, status')
      .in('assignment_id', assignmentIds)
    for (const t of taskData ?? []) {
      if (!taskCounts[t.assignment_id]) taskCounts[t.assignment_id] = { total: 0, done: 0 }
      taskCounts[t.assignment_id].total++
      if (t.status === 'completed' || t.status === 'skipped' || t.status === 'waived') {
        taskCounts[t.assignment_id].done++
      }
    }
  }

  const rows = (assignments ?? []).map(a => {
    const worker = Array.isArray(a.user_profiles) ? a.user_profiles[0] : a.user_profiles as { first_name: string; last_name: string } | null
    const template = Array.isArray(a.onboarding_templates) ? a.onboarding_templates[0] : a.onboarding_templates as { name: string } | null
    const counts = taskCounts[a.id] ?? { total: 0, done: 0 }
    return {
      id: a.id,
      worker_name: worker ? `${worker.first_name} ${worker.last_name}` : '—',
      template_name: template?.name ?? '—',
      progress: counts.total > 0 ? `${counts.done}/${counts.total}` : '—',
      start_date: a.start_date,
      status: a.status,
    }
  })

  const columns: ColDef[] = [
    { key: 'worker_name', header: 'Worker' },
    { key: 'template_name', header: 'Template' },
    { key: 'progress', header: 'Progress' },
    { key: 'start_date', header: 'Start Date', cellConfig: { as: 'date' } },
    { key: 'status', header: 'Status', cellConfig: { as: 'tag', map: { assigned: 'blue', in_progress: 'teal', completed: 'green', cancelled: 'gray' }, transform: true } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/hiring/onboarding/' } },
  ]

  const active = (assignments ?? []).filter(a => a.status === 'assigned' || a.status === 'in_progress').length
  const completed = (assignments ?? []).filter(a => a.status === 'completed').length

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Employee Onboarding</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>{active} active · {completed} completed</p>
        </div>
        <Link href="/hiring/onboarding/templates" style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
          Manage templates →
        </Link>
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No onboarding assignments yet. Complete a hire to auto-assign onboarding checklists.
          </div>
        ) : (
          <DataTableClient id="onboarding-table" rows={rows} columns={columns} searchPlaceholder="Search workers…" />
        )}
      </Tile>
    </div>
  )
}
