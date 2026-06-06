import { createClient } from '@/lib/supabase/server'
import { Grid, Column, Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { LotoForm } from './LotoForm'
import { createLoto } from '@/app/actions/loto'

export default async function NewLotoPage() {
  const supabase = await createClient()

  const { data: energyTypes } = await supabase
    .from('loto_energy_types')
    .select('id, name, colour_code')
    .order('display_order')

  const { data: { user } } = await supabase.auth.getUser()
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // Filter sites to current organisation
  let orgSites: Array<{ id: string; name: string }> = []
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organisation_id')
      .eq('id', user.id)
      .single()
    if (profile) {
      const { data: filteredSites } = await supabase
        .from('sites')
        .select('id, name')
        .eq('organisation_id', profile.organisation_id)
        .eq('is_active', true)
        .order('name')
      orgSites = filteredSites ?? []
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/loto">LOTO Procedures</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Procedure</BreadcrumbItem>
          </Breadcrumb>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '2rem' }}>
            New LOTO Procedure
          </h1>
        </Column>
      </Grid>
      <LotoForm
        energyTypes={energyTypes ?? []}
        sites={orgSites}
        action={createLoto}
      />
    </div>
  )
}
