import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import Link from 'next/link'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function HiringPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [
    { count: activeCount },
    { count: pendingSigCount },
    { count: completedCount },
    { data: recentHires },
  ] = await Promise.all([
    supabase.from('hires').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).in('status', ['draft', 'in_progress']),
    supabase.from('hires').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'pending_signature'),
    supabase.from('hires').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'completed'),
    supabase
      .from('hires')
      .select('id, hire_number, candidate_first_name, candidate_last_name, position_title, status, employment_type, start_date, created_at')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  const stats = [
    { label: 'In Progress', value: activeCount ?? 0, colour: '#0f62fe', bg: '#edf5ff' },
    { label: 'Pending Signature', value: pendingSigCount ?? 0, colour: '#f1c21b', bg: '#fdf6dd' },
    { label: 'Completed', value: completedCount ?? 0, colour: '#24a148', bg: '#defbe6' },
  ]

  const rows = (recentHires ?? []).map(h => ({
    id: h.id,
    hire_number: h.hire_number ?? '—',
    candidate_name: `${h.candidate_first_name ?? ''} ${h.candidate_last_name ?? ''}`.trim() || '—',
    position_title: h.position_title ?? '—',
    employment_type: h.employment_type ?? '—',
    start_date: h.start_date,
    status: h.status,
  }))

  const columns: ColDef[] = [
    { key: 'hire_number', header: 'Hire #' },
    { key: 'candidate_name', header: 'Candidate' },
    { key: 'position_title', header: 'Position' },
    { key: 'employment_type', header: 'Type', cellConfig: { as: 'tag', map: { full_time: 'blue', part_time: 'teal', contractor: 'cyan', casual: 'purple', volunteer: 'gray' }, transform: true } },
    { key: 'start_date', header: 'Start Date', cellConfig: { as: 'date' } },
    { key: 'status', header: 'Status', cellConfig: { as: 'tag', map: { draft: 'gray', in_progress: 'blue', pending_signature: 'teal', completed: 'green', cancelled: 'gray' }, transform: true } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/hiring/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Hiring Pipeline</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>Province-aware hiring workflows with compliance checks and document generation</p>
        </div>
        <NewButton href="/hiring/new" label="New Hire" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <Tile key={s.label} style={{ padding: '1.25rem', backgroundColor: s.bg, border: `1px solid ${s.colour}20` }}>
            <p style={{ fontSize: '2rem', fontWeight: 300, color: s.colour, marginBottom: '0.25rem', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.375rem' }}>{s.label}</p>
          </Tile>
        ))}
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { title: 'Document Templates', desc: 'Offer letters, contracts, NDAs', href: '/hiring/templates' },
          { title: 'Onboarding', desc: 'Active onboarding assignments', href: '/hiring/onboarding' },
          { title: 'Onboarding Templates', desc: 'Create onboarding plan templates', href: '/hiring/onboarding/templates' },
        ].map(card => (
          <Tile key={card.title} style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.5rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>{card.title}</h3>
              <p style={{ fontSize: '0.8125rem', color: '#525252', marginBottom: '0.75rem' }}>{card.desc}</p>
              <Link href={card.href} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>View all →</Link>
            </div>
          </Tile>
        ))}
      </div>

      <Tile style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Recent Hires</h2>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No hires yet —{' '}
            <Link href="/hiring/new" style={{ color: '#0f62fe' }}>start a new hire</Link>
          </div>
        ) : (
          <DataTableClient id="hires-table" rows={rows} columns={columns} searchPlaceholder="Search hires…" />
        )}
      </Tile>
    </div>
  )
}
