import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Tile,
  Tag,
  Breadcrumb,
  BreadcrumbItem,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
        {label}
      </p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps { params: Promise<{ id: string }> }

export default async function WorkerDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: worker } = await supabase
    .from('user_profiles')
    .select(`
      id, first_name, last_name, email, phone, mobile, job_title,
      employment_type, employee_id, hire_date, is_active, notes,
      sites!primary_site_id(name),
      departments!primary_department_id(name)
    `)
    .eq('id', id)
    .single()

  if (!worker) notFound()

  const { data: roles } = await supabase
    .from('user_roles')
    .select('id, roles(name), sites(name), is_active, granted_at')
    .eq('user_id', id)
    .eq('is_active', true)

  const { data: healthProfile } = await supabase
    .from('worker_health_profiles')
    .select('overall_status, has_active_restrictions, last_check_date, next_check_due')
    .eq('user_id', id)
    .maybeSingle()

  const { data: recentChecks } = await supabase
    .from('health_check_records')
    .select('id, check_number, check_date, result, health_surveillance_types(name)')
    .eq('user_id', id)
    .order('check_date', { ascending: false })
    .limit(5)

  const { count: emergencyContactCount } = await supabase
    .from('emergency_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('worker_id', id)

  const siteRaw = worker.sites
  const deptRaw = worker.departments
  const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)
  const dept = Array.isArray(deptRaw) ? (deptRaw[0] as { name: string } | undefined) ?? null : (deptRaw as { name: string } | null)

  function healthStatusTag(status: string): 'green' | 'teal' | 'red' | 'gray' {
    const map: Record<string, 'green' | 'teal' | 'red' | 'gray'> = {
      fit: 'green',
      fit_with_restrictions: 'teal',
      temporarily_unfit: 'red',
      pending_review: 'gray',
    }
    return map[status] ?? 'gray'
  }

  function resultTag(result: string): 'green' | 'teal' | 'red' | 'gray' | 'blue' {
    const map: Record<string, 'green' | 'teal' | 'red' | 'gray' | 'blue'> = {
      fit: 'green',
      fit_with_restrictions: 'teal',
      temporarily_unfit: 'red',
      refer_specialist: 'red',
      pending: 'gray',
      not_completed: 'gray',
    }
    return map[result] ?? 'gray'
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/workers">Worker Profiles</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{worker.first_name} {worker.last_name}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            {worker.first_name} {worker.last_name}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>{worker.job_title ?? '—'}</p>
        </div>
        <a href={`/workers/${id}/edit`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none', marginTop: '0.5rem' }}>
          Edit
        </a>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Profile</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Employee ID">{worker.employee_id ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Employment Type">
                    {worker.employment_type
                      ? <Tag type="blue" size="sm">{(worker.employment_type as string).replace(/_/g, ' ')}</Tag>
                      : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Email">{worker.email}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Phone">{worker.phone ?? worker.mobile ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Primary Site">{site?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Department">{dept?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Hire Date">{formatDate(worker.hire_date)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Status">
                    <Tag type={worker.is_active ? 'green' : 'gray'} size="sm">
                      {worker.is_active ? 'Active' : 'Inactive'}
                    </Tag>
                  </DetailRow>
                </Column>
              </Grid>
            </div>
          </Tile>

          {/* Roles */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Roles</h2>
            </div>
            {!roles || roles.length === 0 ? (
              <div style={{ padding: '1.5rem', fontSize: '0.875rem', color: '#6f6f6f' }}>No roles assigned</div>
            ) : (
              <div style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {roles.map((ur) => {
                  const roleRaw = ur.roles
                  const role = Array.isArray(roleRaw) ? (roleRaw[0] as { name: string } | undefined) ?? null : (roleRaw as { name: string } | null)
                  return (
                    <Tag key={ur.id} type="blue" size="md">{role?.name ?? '—'}</Tag>
                  )
                })}
              </div>
            )}
          </Tile>
        </Column>

        <Column sm={4} md={8} lg={8}>
          {/* Emergency Contacts */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Emergency Contacts</h2>
              <a href={`/workers/${id}/emergency-contacts`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
                Manage
              </a>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.875rem', color: '#525252' }}>
                {(emergencyContactCount ?? 0) === 0
                  ? 'No emergency contacts recorded'
                  : `${emergencyContactCount} contact${emergencyContactCount !== 1 ? 's' : ''} on file`}
              </p>
              <a
                href={`/workers/${id}/emergency-contacts/new`}
                style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
              >
                + Add
              </a>
            </div>
          </Tile>
        </Column>

        <Column sm={4} md={8} lg={8}>
          {/* Health Status */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Health Surveillance</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {!healthProfile ? (
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>No health profile</p>
              ) : (
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Overall Status">
                      <Tag type={healthStatusTag(healthProfile.overall_status)} size="sm">
                        {healthProfile.overall_status.replace(/_/g, ' ')}
                      </Tag>
                    </DetailRow>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Active Restrictions">
                      <Tag type={healthProfile.has_active_restrictions ? 'red' : 'green'} size="sm">
                        {healthProfile.has_active_restrictions ? 'Yes' : 'None'}
                      </Tag>
                    </DetailRow>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Last Check">{formatDate(healthProfile.last_check_date)}</DetailRow>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Next Due">{formatDate(healthProfile.next_check_due)}</DetailRow>
                  </Column>
                </Grid>
              )}
            </div>
          </Tile>

          {/* Recent health checks */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Recent Health Checks</h2>
              <a href="/health" style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>View all</a>
            </div>
            {!recentChecks || recentChecks.length === 0 ? (
              <div style={{ padding: '1.5rem', fontSize: '0.875rem', color: '#6f6f6f', textAlign: 'center' }}>No health checks recorded</div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Date</TableHeader>
                      <TableHeader>Result</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentChecks.map((hc) => {
                      const typeRaw = hc.health_surveillance_types
                      const type = Array.isArray(typeRaw) ? (typeRaw[0] as { name: string } | undefined) ?? null : (typeRaw as { name: string } | null)
                      return (
                        <TableRow key={hc.id}>
                          <TableCell>{type?.name ?? '—'}</TableCell>
                          <TableCell>{formatDate(hc.check_date)}</TableCell>
                          <TableCell>
                            <Tag type={resultTag(hc.result)} size="sm">
                              {hc.result.replace(/_/g, ' ')}
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
        </Column>
      </Grid>
    </div>
  )
}
