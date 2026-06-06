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
import { SiteForm } from './SiteForm'
import { createSite } from '@/app/actions/settings'

export default async function SitesSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('user_profiles').select('organisation_id').eq('id', user.id).single()
    : { data: null }

  const [{ data: sites }, { data: departments }] = profile
    ? await Promise.all([
        supabase.from('sites').select('id, name, code, site_type, is_active').eq('organisation_id', profile.organisation_id).order('name'),
        supabase.from('departments').select('id, name, site_id').eq('organisation_id', profile.organisation_id).order('name'),
      ])
    : [{ data: null }, { data: null }]

  const deptsBySite = new Map<string, { id: string; name: string }[]>()
  for (const d of (departments ?? [])) {
    if (!deptsBySite.has(d.site_id)) deptsBySite.set(d.site_id, [])
    deptsBySite.get(d.site_id)!.push({ id: d.id, name: d.name })
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
          Sites &amp; Departments
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>
          {(sites ?? []).length} site{(sites ?? []).length !== 1 ? 's' : ''} configured
        </p>
      </div>

      <Grid condensed>
        {/* Sites table */}
        <Column sm={4} md={8} lg={12}>
          <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Sites</h2>
            </div>
            {!sites || sites.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No sites configured
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Code</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Departments</TableHeader>
                      <TableHeader>Status</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sites.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.code ?? '—'}</TableCell>
                        <TableCell>{s.site_type ?? '—'}</TableCell>
                        <TableCell>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {(deptsBySite.get(s.id) ?? []).map((d) => (
                              <Tag key={d.id} type="gray" size="sm">{d.name}</Tag>
                            ))}
                            {(deptsBySite.get(s.id) ?? []).length === 0 && <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>None</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tag type={s.is_active ? 'green' : 'gray'} size="sm">
                            {s.is_active ? 'Active' : 'Inactive'}
                          </Tag>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Tile>
        </Column>

        {/* Add site form */}
        <Column sm={4} md={8} lg={4}>
          <Tile style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Add Site</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <SiteForm action={createSite} />
            </div>
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
