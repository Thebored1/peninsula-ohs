import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import OrgDetailActions from './OrgDetailActions'

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: org } = await supabaseAdmin
    .from('organisations')
    .select('id, name, subdomain, slug, subscription_plan, is_active, created_at, industry, timezone, contact_email, onboarding_completed_at')
    .eq('id', id)
    .maybeSingle()

  if (!org) notFound()

  const { data: users } = await supabaseAdmin
    .from('user_profiles')
    .select('id, first_name, last_name, email, is_active, created_at')
    .eq('organisation_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { count: siteCount } = await supabaseAdmin
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', id)

  const { count: incidentCount } = await supabaseAdmin
    .from('incidents')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', id)

  const { data: auditLog } = await supabaseAdmin
    .from('super_admin_audit_log')
    .select('id, action, super_admin_id, ip_address, created_at')
    .eq('target_org_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <a href="/admin/organisations" style={{ fontSize: '0.875rem', color: '#8d8d8d', textDecoration: 'none' }}>
          ← Organisations
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f4f4f4', marginBottom: '0.25rem' }}>{org.name}</h1>
          <p style={{ fontSize: '0.875rem', color: '#8d8d8d' }}>
            {org.subdomain}.exxio.ai · {org.industry ?? 'No industry'} · {org.subscription_plan}
          </p>
        </div>
        <OrgDetailActions orgId={org.id} orgName={org.name} isActive={org.is_active} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Users', value: users?.length ?? 0 },
          { label: 'Sites', value: siteCount ?? 0 },
          { label: 'Incidents', value: incidentCount ?? 0 },
          { label: 'Plan', value: org.subscription_plan },
          { label: 'Status', value: org.is_active ? 'Active' : 'Inactive' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#262626', border: '1px solid #393939', padding: '1rem' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f4f4f4' }}>{s.value}</p>
            <p style={{ fontSize: '0.75rem', color: '#8d8d8d', marginTop: '0.25rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#f4f4f4', marginBottom: '1rem' }}>Users</h2>
      <div style={{ backgroundColor: '#262626', border: '1px solid #393939', marginBottom: '2rem', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #393939' }}>
              {['Name', 'Email', 'Status', 'Joined'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#8d8d8d' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #393939' }}>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#f4f4f4' }}>
                  {u.first_name} {u.last_name}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#c6c6c6' }}>{u.email}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{
                    fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '1rem',
                    backgroundColor: u.is_active ? '#022d0d' : '#2d1515',
                    color: u.is_active ? '#42be65' : '#fa4d56',
                  }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#8d8d8d' }}>
                  {new Date(u.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
            {!users?.length && (
              <tr>
                <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6f6f6f' }}>No users</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(auditLog?.length ?? 0) > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#f4f4f4', marginBottom: '1rem' }}>Admin activity log</h2>
          <div style={{ backgroundColor: '#262626', border: '1px solid #393939', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #393939' }}>
                  {['Action', 'IP', 'When'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#8d8d8d' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLog!.map(entry => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #393939' }}>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#f4f4f4' }}>{entry.action}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#8d8d8d' }}>{entry.ip_address ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#8d8d8d' }}>
                      {new Date(entry.created_at).toLocaleString('en-AU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
