import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function AdminDashboardPage() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [totalOrgs, newOrgs, activeOrgs, trialOrgs, totalUsers, activeUsers] = await Promise.all([
    supabaseAdmin.from('organisations').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('organisations').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabaseAdmin.from('organisations').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('organisations').select('id', { count: 'exact', head: true }).eq('subscription_plan', 'trial'),
    supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const { data: recentOrgs } = await supabaseAdmin
    .from('organisations')
    .select('id, name, subdomain, subscription_plan, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  const stats = [
    { label: 'Total organisations', value: totalOrgs.count ?? 0 },
    { label: 'New this month', value: newOrgs.count ?? 0 },
    { label: 'Active', value: activeOrgs.count ?? 0 },
    { label: 'On trial', value: trialOrgs.count ?? 0 },
    { label: 'Total users', value: totalUsers.count ?? 0 },
    { label: 'Active users', value: activeUsers.count ?? 0 },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f4f4f4', marginBottom: '2rem' }}>
        Dashboard
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {stats.map(stat => (
          <div key={stat.label} style={{
            backgroundColor: '#262626', border: '1px solid #393939',
            padding: '1.25rem 1.5rem',
          }}>
            <p style={{ fontSize: '2rem', fontWeight: 600, color: '#f4f4f4', lineHeight: 1 }}>{stat.value}</p>
            <p style={{ fontSize: '0.75rem', color: '#8d8d8d', marginTop: '0.375rem' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#f4f4f4', marginBottom: '1rem' }}>
        Recent registrations
      </h2>
      <div style={{ backgroundColor: '#262626', border: '1px solid #393939', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #393939' }}>
              {['Organisation', 'Subdomain', 'Plan', 'Status', 'Registered'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#8d8d8d' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(recentOrgs ?? []).map(org => (
              <tr key={org.id} style={{ borderBottom: '1px solid #393939' }}>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#f4f4f4' }}>
                  <a href={`/admin/organisations/${org.id}`} style={{ color: '#78a9ff', textDecoration: 'none' }}>
                    {org.name}
                  </a>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#c6c6c6' }}>
                  {org.subdomain ?? org.subdomain ?? '—'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#c6c6c6' }}>
                  {org.subscription_plan}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{
                    fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '1rem',
                    backgroundColor: org.is_active ? '#022d0d' : '#2d1515',
                    color: org.is_active ? '#42be65' : '#fa4d56',
                  }}>
                    {org.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#8d8d8d' }}>
                  {new Date(org.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
            {!recentOrgs?.length && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', fontSize: '0.875rem', color: '#6f6f6f' }}>
                  No organisations yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
