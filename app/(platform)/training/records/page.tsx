import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function TrainingRecordsPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('training_records')
    .select('id, record_number, completed_date, expiry_date, status, delivery_method, provider, user_profiles!worker_id(first_name, last_name), training_courses!course_id(name)')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  const rows = (data ?? []).map((r) => {
    const workerRaw = r.user_profiles
    const courseRaw = r.training_courses
    const worker = Array.isArray(workerRaw)
      ? (workerRaw[0] as { first_name: string; last_name: string } | undefined) ?? null
      : (workerRaw as { first_name: string; last_name: string } | null)
    const course = Array.isArray(courseRaw)
      ? (courseRaw[0] as { name: string } | undefined) ?? null
      : (courseRaw as { name: string } | null)
    return {
      id: r.id,
      record_number: r.record_number ?? '—',
      worker_name: worker ? `${worker.first_name} ${worker.last_name}` : '—',
      course_name: course?.name ?? '—',
      completed_date: formatDate(r.completed_date),
      expiry_date: r.expiry_date ?? null,
      status: r.status,
      provider: r.provider ?? '—',
    }
  })

  const columns: ColDef[] = [
    { key: 'record_number', header: 'Record #', cellConfig: { as: 'monospace' } },
    { key: 'worker_name', header: 'Worker' },
    { key: 'course_name', header: 'Course' },
    { key: 'completed_date', header: 'Completed' },
    { key: 'expiry_date', header: 'Expires', cellConfig: { as: 'due_date' } },
    {
      key: 'status',
      header: 'Status',
      cellConfig: {
        as: 'tag',
        map: { current: 'green', expiring_soon: 'teal', expired: 'red' },
        transform: true,
      },
    },
    { key: 'provider', header: 'Provider' },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/training/records/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Training Records</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} record{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NewButton href="/training/records/new" label="Log Training" />
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No training records logged yet
          </div>
        ) : (
          <DataTableClient
            id="training-records-table"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search training records…"
          />
        )}
      </Tile>
    </div>
  )
}
