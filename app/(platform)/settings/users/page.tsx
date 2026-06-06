import { createClient } from '@/lib/supabase/server'
import {
  Tile,
  Tag,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react'

export default async function UsersSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('user_profiles').select('organisation_id').eq('id', user.id).single()
    : { data: null }

  const { data: users } = profile
    ? await supabase
        .from('user_profiles')
        .select(`
          id, first_name, last_name, email, job_title, is_active,
          user_roles!user_id(roles(name), is_active)
        `)
        .eq('organisation_id', profile.organisation_id)
        .order('last_name')
    : { data: null }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
          Users &amp; Roles
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>
          {(users ?? []).length} user{(users ?? []).length !== 1 ? 's' : ''}
        </p>
      </div>

      <Tile style={{ padding: 0 }}>
        {!users || users.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No users found
          </div>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Job Title</TableHeader>
                  <TableHeader>Roles</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => {
                  const rolesRaw = u.user_roles ?? []
                  const activeRoles = rolesRaw
                    .filter((ur: { is_active: boolean }) => ur.is_active)
                    .map((ur: { roles: unknown }) => {
                      const roleRaw = ur.roles
                      const role = Array.isArray(roleRaw)
                        ? (roleRaw[0] as { name: string } | undefined) ?? null
                        : (roleRaw as { name: string } | null)
                      return role?.name ?? null
                    })
                    .filter(Boolean) as string[]
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <a href={`/workers/${u.id}`} style={{ color: '#0f62fe', textDecoration: 'none', fontSize: '0.875rem' }}>
                          {u.first_name} {u.last_name}
                        </a>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.job_title ?? '—'}</TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {activeRoles.length > 0
                            ? activeRoles.map((r) => <Tag key={r} type="blue" size="sm">{r}</Tag>)
                            : <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>No roles</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tag type={u.is_active ? 'green' : 'gray'} size="sm">
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Tag>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Tile>
    </div>
  )
}
