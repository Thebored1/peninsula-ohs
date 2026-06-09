import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import Link from 'next/link'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

export default async function BackgroundChecksPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [
    { count: consentPending },
    { count: inProgress },
    { count: reviewPending },
    { count: activeExpired },
    { data: recentPackages },
  ] = await Promise.all([
    supabase.from('bgc_packages').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'consent_pending'),
    supabase.from('bgc_packages').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'in_progress'),
    supabase.from('bgc_packages').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'review_pending'),
    supabase.from('worker_licences').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'expired'),
    supabase
      .from('bgc_packages')
      .select('id, package_number, candidate_first_name, candidate_last_name, position_title, status, created_at')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const stats = [
    { label: 'Consent Pending', value: consentPending ?? 0, colour: '#f1c21b', bg: '#fdf6dd' },
    { label: 'Checks In Progress', value: inProgress ?? 0, colour: '#0f62fe', bg: '#edf5ff' },
    { label: 'Awaiting Review', value: reviewPending ?? 0, colour: '#fa4d56', bg: '#fff1f1' },
    { label: 'Expired Licences', value: activeExpired ?? 0, colour: '#8a3ffc', bg: '#f6f2ff' },
  ]

  const rows = (recentPackages ?? []).map(p => ({
    id: p.id,
    package_number: p.package_number ?? '—',
    candidate_name: `${p.candidate_first_name ?? ''} ${p.candidate_last_name ?? ''}`.trim() || '—',
    position_title: p.position_title ?? '—',
    status: p.status,
    created_at: p.created_at,
  }))

  const columns: ColDef[] = [
    { key: 'package_number', header: 'Package #' },
    { key: 'candidate_name', header: 'Candidate' },
    { key: 'position_title', header: 'Position' },
    { key: 'status', header: 'Status', cellConfig: {
      as: 'tag',
      map: {
        draft: 'gray', consent_pending: 'gray', consent_given: 'teal',
        ordering: 'blue', in_progress: 'blue', review_pending: 'red',
        adjudicated: 'purple', complete: 'green', withdrawn: 'gray',
      },
      transform: true,
    }},
    { key: 'created_at', header: 'Created', cellConfig: { as: 'date' } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/background-checks/packages/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Background Checks
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            Canadian pre-employment and post-employment background verification
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <Tile key={s.label} style={{ padding: '1.25rem', backgroundColor: s.bg, border: `1px solid ${s.colour}20` }}>
            <p style={{ fontSize: '2rem', fontWeight: 300, color: s.colour, marginBottom: '0.25rem', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.375rem' }}>{s.label}</p>
          </Tile>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { title: 'All Packages', desc: 'View all background check packages', href: '/background-checks/packages' },
          { title: 'Reference Checks', desc: 'Manage reference questionnaires', href: '/background-checks/reference-checks' },
          { title: 'Worker Licences', desc: 'Licence compliance and expiry tracking', href: '/background-checks/licences' },
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
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Recent Packages</h2>
          <Link href="/background-checks/packages" style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>View all</Link>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No background check packages yet. Packages are created automatically when a new hire requires a background check.
          </div>
        ) : (
          <DataTableClient id="bgc-packages-table" rows={rows} columns={columns} searchPlaceholder="Search packages…" />
        )}
      </Tile>
    </div>
  )
}
