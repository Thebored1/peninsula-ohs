import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function AdminOrganisationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; status?: string }>
}) {
  const params = await searchParams
  const q = params.q ?? ''
  const plan = params.plan ?? ''
  const status = params.status ?? ''

  let query = supabaseAdmin
    .from('organisations')
    .select('id, name, subdomain, subscription_plan, is_active, created_at, industry')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) query = query.ilike('name', `%${q}%`)
  if (plan) query = query.eq('subscription_plan', plan)
  if (status === 'active') query = query.eq('is_active', true)
  if (status === 'inactive') query = query.eq('is_active', false)

  const { data: orgs } = await query

  // Get user counts per org
  const orgIds = (orgs ?? []).map(o => o.id)
  const { data: userCounts } = orgIds.length
    ? await supabaseAdmin
        .from('user_profiles')
        .select('organisation_id')
        .in('organisation_id', orgIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const u of userCounts ?? []) {
    countMap[u.organisation_id] = (countMap[u.organisation_id] ?? 0) + 1
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f4f4f4' }}>Organisations</h1>
        <span style={{ fontSize: '0.875rem', color: '#8d8d8d' }}>{orgs?.length ?? 0} results</span>
      </div>

      <form style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          name="q" defaultValue={q} placeholder="Search by name…"
          style={{
            flex: 2, minWidth: '200px', padding: '0.5rem 0.75rem',
            backgroundColor: '#262626', border: '1px solid #393939',
            color: '#f4f4f4', fontSize: '0.875rem',
          }}
        />
        <select name="plan" defaultValue={plan} style={{ padding: '0.5rem', backgroundColor: '#262626', border: '1px solid #393939', color: '#f4f4f4', fontSize: '0.875rem' }}>
          <option value="">All plans</option>
          <option value="trial">Trial</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select name="status" defaultValue={status} style={{ padding: '0.5rem', backgroundColor: '#262626', border: '1px solid #393939', color: '#f4f4f4', fontSize: '0.875rem' }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="submit" style={{
          padding: '0.5rem 1rem', backgroundColor: '#0f62fe', border: 'none',
          color: '#fff', fontSize: '0.875rem', cursor: 'pointer',
        }}>
          Filter
        </button>
      </form>

      <div style={{ backgroundColor: '#262626', border: '1px solid #393939', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #393939' }}>
              {['Organisation', 'Subdomain', 'Plan', 'Users', 'Status', 'Registered', ''].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#8d8d8d' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(orgs ?? []).map(org => (
              <tr key={org.id} style={{ borderBottom: '1px solid #393939' }}>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                  <a href={`/admin/organisations/${org.id}`} style={{ color: '#78a9ff', textDecoration: 'none', fontWeight: 500 }}>
                    {org.name}
                  </a>
                  {org.industry && (
                    <p style={{ fontSize: '0.75rem', color: '#8d8d8d', marginTop: '0.125rem' }}>{org.industry}</p>
                  )}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#c6c6c6' }}>
                  {org.subdomain ?? '—'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#c6c6c6' }}>
                  {org.subscription_plan}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#c6c6c6' }}>
                  {countMap[org.id] ?? 0}
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
                <td style={{ padding: '0.75rem 1rem' }}>
                  <a href={`/admin/organisations/${org.id}`} style={{ fontSize: '0.75rem', color: '#78a9ff', textDecoration: 'none' }}>
                    View →
                  </a>
                </td>
              </tr>
            ))}
            {!orgs?.length && (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', fontSize: '0.875rem', color: '#6f6f6f' }}>
                  No organisations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
