import { createClient } from '@/lib/supabase/server'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

type ActionRow = {
  id: string
  action_number: string | null
  title: string
  action_type: string
  priority: string
  due_date: string | null
  extended_due_date: string | null
  status: string
  user_profiles: { first_name: string; last_name: string } | null
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: '#24a148' },
  medium: { label: 'Medium', color: '#f1c21b' },
  high: { label: 'High', color: '#f97316' },
  critical: { label: 'Critical', color: '#da1e28' },
}

function isOverdue(action: ActionRow): boolean {
  if (!action.due_date) return false
  const terminalStatuses = ['closed', 'completed', 'verified', 'cancelled']
  if (terminalStatuses.includes(action.status)) return false
  const effectiveDue = action.extended_due_date ?? action.due_date
  return new Date(effectiveDue) < new Date(new Date().toDateString())
}

const columns: ColDef[] = [
  { key: 'action_number', header: 'Action #' },
  { key: 'title', header: 'Title' },
  {
    key: 'action_type',
    header: 'Type',
    cellConfig: { as: 'text_link', prefix: '/actions/' },
  },
  {
    key: 'priority_label',
    header: 'Priority',
    cellConfig: { as: 'priority_dot', colorField: 'priority_color' },
  },
  { key: 'assigned_to', header: 'Assigned To' },
  {
    key: 'due_date',
    header: 'Due Date',
    cellConfig: { as: 'due_date' },
  },
  {
    key: 'status',
    header: 'Status',
    cellConfig: {
      as: 'tag',
      map: {
        open: 'blue',
        in_progress: 'blue',
        completed: 'green',
        verification_pending: 'cyan',
        verified: 'teal',
        closed: 'gray',
        overdue: 'red',
        reopened: 'blue',
        cancelled: 'gray',
      },
      transform: true,
    },
  },
]

export default async function ActionsPage() {
  const supabase = await createClient()

  const { data: actions } = await supabase
    .from('actions')
    .select(
      'id, action_number, title, action_type, priority, due_date, extended_due_date, status, user_profiles!assigned_to(first_name, last_name)',
    )
    .order('due_date', { ascending: true, nullsFirst: false })

  const rows: ActionRow[] = (actions ?? []) as unknown as ActionRow[]

  const openCount = rows.filter((r) => r.status === 'open').length
  const inProgressCount = rows.filter((r) => r.status === 'in_progress').length
  const overdueCount = rows.filter((r) => isOverdue(r) || r.status === 'overdue').length
  const completedCount = rows.filter((r) =>
    ['completed', 'verified', 'verification_pending'].includes(r.status),
  ).length

  const tableRows = rows.map((action) => {
    const assignee = action.user_profiles
      ? `${action.user_profiles.first_name} ${action.user_profiles.last_name}`
      : '—'
    const effectiveDue = action.extended_due_date ?? action.due_date
    const pc = priorityConfig[action.priority] ?? { label: action.priority, color: '#525252' }

    return {
      id: action.id,
      action_number: action.action_number ?? '—',
      title: action.title,
      action_type: action.action_type,
      priority_label: pc.label,
      priority_color: pc.color,
      assigned_to: assignee,
      due_date: effectiveDue ?? null,
      status: action.status,
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      {/* Page header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Actions</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.25rem' }}>
            {rows.length} {rows.length === 1 ? 'action' : 'actions'} total
          </p>
        </div>
        <Button kind="primary" href="/actions/new" style={{ justifyContent: 'center' }}>Add Action</Button>
      </div>

      {/* Status counters */}
      <div style={{ display: 'flex', width: '100%', gap: '1px', marginBottom: '1.5rem', backgroundColor: '#e0e0e0' }}>
        {([
          { label: 'Open',        count: openCount,       accent: '#0f62fe', color: '#0043ce', bg: '#ffffff' },
          { label: 'In Progress', count: inProgressCount, accent: '#8a3ffc', color: '#6929c4', bg: '#ffffff' },
          { label: 'Overdue',     count: overdueCount,    accent: '#da1e28', color: '#a2191f', bg: overdueCount > 0 ? '#fff1f1' : '#ffffff' },
          { label: 'Completed',   count: completedCount,  accent: '#24a148', color: '#198038', bg: '#ffffff' },
        ] as { label: string; count: number; accent: string; color: string; bg: string }[]).map(({ label, count, accent, color, bg }) => (
          <div key={label} style={{ flex: 1, minWidth: 0, padding: '0.875rem 1.25rem', backgroundColor: bg, borderLeft: `3px solid ${accent}` }}>
            <p style={{ fontSize: '0.6875rem', color: '#6f6f6f', letterSpacing: '0.32px', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
              {label}
            </p>
            <p style={{ fontSize: '1.75rem', fontWeight: 300, color, lineHeight: 1 }}>{count}</p>
          </div>
        ))}
      </div>

      {/* DataTable */}
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
            <p style={{ fontWeight: 600, color: '#161616', marginBottom: '0.5rem' }}>
              No actions found
            </p>
            <p>Create an action to track corrective or preventive work.</p>
          </div>
        ) : (
          <DataTableClient
            id="actions-search"
            rows={tableRows}
            columns={columns}
            searchPlaceholder="Search actions…"
          />
        )}
      </Tile>
    </div>
  )
}
