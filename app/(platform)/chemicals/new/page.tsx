import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { ChemicalForm } from './ChemicalForm'
import { createChemical } from '@/app/actions/chemicals'

export const dynamic = 'force-dynamic'

export default async function NewChemicalPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: physicalStates }] = await Promise.all([
    supabase.from('chemical_categories').select('id, name').eq('is_active', true).order('display_order'),
    supabase.from('chemical_physical_states').select('id, name').eq('is_active', true).order('display_order'),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/chemicals">Chemicals</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Add Chemical</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Add Chemical</h1>
          </div>
        </Column>
      </Grid>
      <ChemicalForm categories={categories ?? []} physicalStates={physicalStates ?? []} action={createChemical} />
    </div>
  )
}
