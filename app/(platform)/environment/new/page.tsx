import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { MonitoringForm } from './MonitoringForm'
import { createMonitoringRecord } from '@/app/actions/environment'

export default async function NewMonitoringPage() {
  const supabase = await createClient()

  const [{ data: parameterTypes }, { data: units }, { data: stations }] = await Promise.all([
    supabase.from('env_parameter_types').select('id, name, monitoring_category').eq('is_active', true).order('display_order'),
    supabase.from('env_measurement_units').select('id, name, symbol').eq('is_active', true).order('display_order'),
    supabase.from('env_monitoring_stations').select('id, name, station_code').eq('is_active', true).order('name'),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/environment">Environmental Monitoring</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Log Reading</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Log Monitoring Reading</h1>
          </div>
        </Column>
      </Grid>
      <MonitoringForm parameterTypes={parameterTypes ?? []} units={units ?? []} stations={stations ?? []} action={createMonitoringRecord} />
    </div>
  )
}
