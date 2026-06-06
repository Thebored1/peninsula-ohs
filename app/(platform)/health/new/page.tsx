import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { HealthCheckForm } from './HealthCheckForm'
import { createHealthCheckRecord } from '@/app/actions/health'

export default async function NewHealthCheckPage() {
  const supabase = await createClient()

  const [{ data: workers }, { data: surveillanceTypes }] = await Promise.all([
    supabase.from('user_profiles').select('id, first_name, last_name').eq('is_active', true).order('last_name'),
    supabase.from('health_surveillance_types').select('id, name').eq('is_active', true).order('display_order'),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/health">Health Surveillance</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Log Health Check</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Log Health Check</h1>
          </div>
        </Column>
      </Grid>
      <HealthCheckForm workers={workers ?? []} surveillanceTypes={surveillanceTypes ?? []} action={createHealthCheckRecord} />
    </div>
  )
}
