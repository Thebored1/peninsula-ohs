import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import {
  Tile,
  Button,
  Tag,
} from '@carbon/react'
import { DataTableClient } from '@/components/table/DataTableClient'
import CancelInvitationButton from './CancelInvitationButton'
import InviteUserForm from './InviteUserForm'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function UsersSettingsPage() {
  const orgId = await getOrgId()

  if (!orgId) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#6f6f6f' }}>No organisation found.</p>
      </div>
    )
  }

  const supabase = await createClient()

  const [
    { data: users },
    { data: invitations },
    { data: roles },
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email, is_active, created_at')
      .eq('organisation_id', orgId)
      .order('first_name'),
    supabase
      .from('user_invitations')
      .select('id, email, status, expires_at, created_at, roles(name)')
      .eq('organisation_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('roles')
      .select('id, name')
      .eq('organisation_id', orgId)
      .order('name'),
  ])

  const userList = users ?? []
  const invitationList = invitations ?? []
  const roleList = roles ?? []

  const totalUsers = userList.length
  const activeUsers = userList.filter((u) => u.is_active).length
  const inactiveUsers = userList.filter((u) => !u.is_active).length
  const pendingInvitations = invitationList.length

  const tableRows = userList.map((u) => ({
    id: u.id,
    name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || '—',
    email: u.email ?? '—',
    status: u.is_active ? 'active' : 'inactive',
    joined: formatDate(u.created_at),
  }))

  const tableColumns = [
    { key: 'name', header: 'Name', cellConfig: { as: 'text_link' as const, prefix: '/workers/' } },
    { key: 'email', header: 'Email' },
    {
      key: 'status',
      header: 'Status',
      cellConfig: {
        as: 'tag' as const,
        map: { active: 'green' as const, inactive: 'gray' as const },
      },
    },
    { key: 'joined', header: 'Joined' },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Users &amp; Roles
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            Manage users and send invitations for your organisation.
          </p>
        </div>
        <a href="#invite-user">
          <Button kind="primary">Invite User</Button>
        </a>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Users', value: totalUsers },
          { label: 'Active', value: activeUsers },
          { label: 'Inactive', value: inactiveUsers },
          { label: 'Pending Invitations', value: pendingInvitations },
        ].map(({ label, value }) => (
          <Tile key={label} style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: '2rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.5rem' }}>{label}</p>
          </Tile>
        ))}
      </div>

      {/* Users table */}
      <Tile style={{ padding: 0, marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem 0.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Members</h2>
        </div>
        {tableRows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No users found.
          </div>
        ) : (
          <DataTableClient
            id="users-table"
            rows={tableRows}
            columns={tableColumns}
            searchPlaceholder="Search users…"
          />
        )}
      </Tile>

      {/* Pending invitations */}
      {invitationList.length > 0 && (
        <Tile style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
            Pending Invitations
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {invitationList.map((inv) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const roleName = (inv as any).roles?.name ?? null
              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f4f4f4',
                    borderRadius: '2px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#161616' }}>{inv.email}</span>
                    {roleName && <Tag type="blue" size="sm">{roleName}</Tag>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                      Expires {formatDate(inv.expires_at)}
                    </span>
                    <CancelInvitationButton invitationId={inv.id} />
                  </div>
                </div>
              )
            })}
          </div>
        </Tile>
      )}

      {/* Invite User form */}
      <Tile id="invite-user" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
          Invite New User
        </h2>
        <InviteUserForm roles={roleList} />
      </Tile>
    </div>
  )
}
