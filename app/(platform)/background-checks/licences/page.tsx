import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Tag } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

export default async function LicencesPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [
    { count: activeCount },
    { count: expiredCount },
    { count: expiringSoonCount },
    { data: licences },
  ] = await Promise.all([
    supabase.from('worker_licences').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'active'),
    supabase.from('worker_licences').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'expired'),
    supabase.from('worker_licences').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'active')
      .gte('expiry_date', new Date().toISOString().slice(0, 10))
      .lte('expiry_date', new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10)),
    supabase
      .from('worker_licences')
      .select('id, worker_id, licence_type, licence_number, issuing_body, issuing_province, expiry_date, status, user_profiles(first_name, last_name)')
      .eq('organisation_id', orgId)
      .order('expiry_date', { ascending: true })
      .limit(100),
  ])

  const stats = [
    { label: 'Active Licences', value: activeCount ?? 0, colour: '#24a148', bg: '#defbe6' },
    { label: 'Expired', value: expiredCount ?? 0, colour: '#da1e28', bg: '#fff1f1' },
    { label: 'Expiring (90 days)', value: expiringSoonCount ?? 0, colour: '#f1c21b', bg: '#fdf6dd' },
  ]

  const rows = (licences ?? []).map(l => {
    const days = daysUntil(l.expiry_date)
    const profile = (l.user_profiles as unknown as Array<{ first_name: string; last_name: string }> | null)?.[0] ?? null
    return {
      id: l.id,
      worker_name: profile ? `${profile.first_name} ${profile.last_name}` : '—',
      licence_type: l.licence_type,
      licence_number: l.licence_number ?? '—',
      issuing_body: l.issuing_body ?? '—',
      expiry_date: l.expiry_date,
      days_until_expiry: days != null ? (days < 0 ? `${Math.abs(days)}d ago` : `${days}d`) : '—',
      status: l.status,
    }
  })

  const columns: ColDef[] = [
    { key: 'worker_name', header: 'Worker' },
    { key: 'licence_type', header: 'Licence' },
    { key: 'licence_number', header: 'Number' },
    { key: 'issuing_body', header: 'Issuing Body' },
    { key: 'expiry_date', header: 'Expiry', cellConfig: { as: 'date' } },
    { key: 'days_until_expiry', header: 'Days' },
    { key: 'status', header: 'Status', cellConfig: {
      as: 'tag',
      map: { active: 'green', expired: 'red', suspended: 'gray', cancelled: 'gray' },
      transform: true,
    }},
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Worker Licences</h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>
          Professional licence and certification compliance tracking with automated expiry alerts
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <Tile key={s.label} style={{ padding: '1.25rem', backgroundColor: s.bg, border: `1px solid ${s.colour}20` }}>
            <p style={{ fontSize: '2rem', fontWeight: 300, color: s.colour, marginBottom: '0.25rem', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.375rem' }}>{s.label}</p>
          </Tile>
        ))}
      </div>

      <Tile style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>All Licences</h2>
          <p style={{ fontSize: '0.8125rem', color: '#525252', marginTop: 4 }}>
            Sorted by expiry date. Alerts are sent automatically at 90, 60, and 30 days before expiry.
          </p>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No licences recorded. Add licences from individual worker profiles.
          </div>
        ) : (
          <DataTableClient id="licences-table" rows={rows} columns={columns} searchPlaceholder="Search licences…" />
        )}
      </Tile>
    </div>
  )
}
