import { createClient } from '@/lib/supabase/server'
import {
  Grid,
  Column,
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

type TagType = 'green' | 'gray' | 'red' | 'blue'

function integrationStatusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    active: 'green',
    inactive: 'gray',
    error: 'red',
    pending_setup: 'blue',
  }
  return map[status] ?? 'gray'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function IntegrationsSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('user_profiles').select('organisation_id').eq('id', user.id).single()
    : { data: null }

  const [{ data: integrations }, { data: webhooks }, { data: apiKeys }] = profile
    ? await Promise.all([
        supabase
          .from('integrations')
          .select('id, name, description, status, last_sync_at, last_sync_status, integration_types(name, category)')
          .eq('organisation_id', profile.organisation_id)
          .order('created_at'),
        supabase
          .from('webhook_endpoints')
          .select('id, url, description, is_active, created_at')
          .eq('organisation_id', profile.organisation_id)
          .order('created_at'),
        supabase
          .from('api_keys')
          .select('id, name, key_prefix, is_active, last_used_at, expires_at, created_at')
          .eq('organisation_id', profile.organisation_id)
          .order('created_at'),
      ])
    : [{ data: null }, { data: null }, { data: null }]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
          Integrations
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>
          Connected systems, webhooks and API keys
        </p>
      </div>

      {/* Integrations */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>Integrations</h2>
      {(integrations ?? []).length === 0 ? (
        <Tile style={{ padding: 0, marginBottom: '2rem' }}>
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No integrations configured
          </div>
        </Tile>
      ) : (
      <Grid condensed style={{ marginBottom: '2rem' }}>
        {(integrations ?? []).map((int) => {
          const typeRaw = int.integration_types
          const type = Array.isArray(typeRaw) ? (typeRaw[0] as { name: string; category: string } | undefined) ?? null : (typeRaw as { name: string; category: string } | null)
          return (
            <Column key={int.id} sm={4} md={4} lg={4}>
              <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <Tag type="gray" size="sm">{type?.category?.replace(/_/g, ' ') ?? 'integration'}</Tag>
                  <Tag type={integrationStatusTag(int.status)} size="sm">{int.status.replace(/_/g, ' ')}</Tag>
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>{int.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem' }}>{type?.name ?? '—'}</p>
                {int.last_sync_at && (
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                    Last sync: {formatDate(int.last_sync_at)}
                    {int.last_sync_status && (
                      <span style={{ marginLeft: '0.5rem', color: int.last_sync_status === 'success' ? '#24a148' : '#da1e28' }}>
                        ({int.last_sync_status})
                      </span>
                    )}
                  </p>
                )}
              </Tile>
            </Column>
          )
        })}
      </Grid>
      )}

      {/* Webhooks */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>Webhook Endpoints</h2>
      <Tile style={{ padding: 0, marginBottom: '2rem' }}>
        {!webhooks || webhooks.length === 0 ? (
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No webhook endpoints registered
          </div>
        ) : (
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>URL</TableHeader>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Created</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {webhooks.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{w.url}</span>
                    </TableCell>
                    <TableCell>{w.description ?? '—'}</TableCell>
                    <TableCell>
                      <Tag type={w.is_active ? 'green' : 'gray'} size="sm">{w.is_active ? 'Active' : 'Inactive'}</Tag>
                    </TableCell>
                    <TableCell>{formatDate(w.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Tile>

      {/* API Keys */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>API Keys</h2>
      <Tile style={{ padding: 0 }}>
        {!apiKeys || apiKeys.length === 0 ? (
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No API keys created
          </div>
        ) : (
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Key Prefix</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Last Used</TableHeader>
                  <TableHeader>Expires</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {apiKeys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell>{k.name}</TableCell>
                    <TableCell>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{k.key_prefix}…</span>
                    </TableCell>
                    <TableCell>
                      <Tag type={k.is_active ? 'green' : 'gray'} size="sm">{k.is_active ? 'Active' : 'Revoked'}</Tag>
                    </TableCell>
                    <TableCell>{formatDate(k.last_used_at)}</TableCell>
                    <TableCell>{formatDate(k.expires_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Tile>
    </div>
  )
}
