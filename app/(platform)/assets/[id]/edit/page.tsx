import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { EditAssetForm } from './EditForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function EditAssetPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: asset }, { data: assetTypes }, { data: assetStatuses }] = await Promise.all([
    supabase
      .from('assets')
      .select('name, asset_type_id, status_id, serial_number, asset_tag, manufacturer, model, year_of_manufacture, purchase_date, warranty_expiry_date, replacement_cost, location_details, inspection_frequency, next_inspection_due, next_maintenance_due, description, notes, risk_classification')
      .eq('id', id)
      .single(),
    supabase.from('asset_types').select('id, name').eq('is_active', true).order('name'),
    supabase.from('asset_statuses').select('id, name').order('name'),
  ])

  if (!asset) notFound()

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/assets">Asset Register</BreadcrumbItem>
            <BreadcrumbItem href={`/assets/${id}`}>Details</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Edit</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Edit Asset</h1>
          </div>
        </Column>
      </Grid>
      <EditAssetForm id={id} initialData={asset} assetTypes={assetTypes ?? []} assetStatuses={assetStatuses ?? []} />
    </div>
  )
}
