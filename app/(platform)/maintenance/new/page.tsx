import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { MaintenanceForm } from './MaintenanceForm'
import { createMaintenanceRecord } from '@/app/actions/maintenance'

interface PageProps {
  searchParams: Promise<{ asset_id?: string }>
}

export default async function NewMaintenancePage({ searchParams }: PageProps) {
  const { asset_id } = await searchParams
  const supabase = await createClient()

  const [{ data: assets }, { data: maintenanceTypes }] = await Promise.all([
    supabase
      .from('assets')
      .select('id, name, asset_number')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('maintenance_types')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order'),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/maintenance">Maintenance</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Log Maintenance</BreadcrumbItem>
          </Breadcrumb>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>
              Log Maintenance Record
            </h1>
          </div>
        </Column>
      </Grid>

      <MaintenanceForm
        assets={assets ?? []}
        maintenanceTypes={maintenanceTypes ?? []}
        defaultAssetId={asset_id ?? null}
        action={createMaintenanceRecord}
      />
    </div>
  )
}
