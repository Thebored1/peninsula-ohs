import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { AssetForm } from './AssetForm'
import { createAsset } from '@/app/actions/assets'

export default async function NewAssetPage() {
  const supabase = await createClient()

  const [{ data: assetTypes }, { data: assetStatuses }] = await Promise.all([
    supabase.from('asset_types').select('id, name').eq('is_active', true).order('display_order'),
    supabase.from('asset_statuses').select('id, name').eq('is_active', true).order('display_order'),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/assets">Asset Register</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Asset</BreadcrumbItem>
          </Breadcrumb>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>
              Add Asset
            </h1>
          </div>
        </Column>
      </Grid>

      <AssetForm
        assetTypes={assetTypes ?? []}
        assetStatuses={assetStatuses ?? []}
        action={createAsset}
      />
    </div>
  )
}
