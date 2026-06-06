import { createClient } from '@/lib/supabase/server'
import { Tile, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

const columns: ColDef[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'job_title', header: 'Job Title' },
  {
    key: 'employment_type',
    header: 'Employment',
    cellConfig: {
      as: 'tag',
      map: {
        full_time: 'blue',
        part_time: 'teal',
        contractor: 'gray',
        casual: 'gray',
        volunteer: 'green',
      },
      transform: true,
    },
  },
  { key: 'site_name', header: 'Site' },
  { key: 'department_name', header: 'Department' },
  {
    key: 'view',
    header: '',
    cellConfig: { as: 'view_link', prefix: '/workers/' },
  },
]

export default async function WorkersPage() {
  const supabase = await createClient()

  const { data: workers } = await supabase
    .from('user_profiles')
    .select(
      'id, first_name, last_name, email, job_title, employment_type, is_active, sites!primary_site_id(name), departments!primary_department_id(name)'
    )
    .order('last_name', { ascending: true })

  const rows = (workers ?? []).map((w) => {
    const siteRaw = w.sites
    const deptRaw = w.departments
    const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)
    const dept = Array.isArray(deptRaw) ? (deptRaw[0] as { name: string } | undefined) ?? null : (deptRaw as { name: string } | null)
    return {
      id: w.id,
      name: `${w.first_name} ${w.last_name}`,
      email: w.email,
      job_title: w.job_title ?? '—',
      employment_type: w.employment_type ?? null,
      site_name: site?.name ?? '—',
      department_name: dept?.name ?? '—',
      is_active: w.is_active,
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Worker Profiles
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} worker{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button kind="primary" href="/workers/new" size="sm">Add Worker</Button>
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No workers found
          </div>
        ) : (
          <DataTableClient
            id="workers-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search workers…"
          />
        )}
      </Tile>
    </div>
  )
}
