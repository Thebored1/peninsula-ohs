import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { EditChemicalForm } from './EditForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function EditChemicalPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: chem }, { data: categories }, { data: physicalStates }] = await Promise.all([
    supabase
      .from('chemicals')
      .select('name, category_id, physical_state_id, cas_number, un_number, chemical_formula, storage_class, quantity_unit, is_hazardous, notes')
      .eq('id', id)
      .single(),
    supabase.from('chemical_categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('chemical_physical_states').select('id, name').order('name'),
  ])

  if (!chem) notFound()

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/chemicals">Chemicals</BreadcrumbItem>
            <BreadcrumbItem href={`/chemicals/${id}`}>Details</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Edit</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Edit Chemical</h1>
          </div>
        </Column>
      </Grid>
      <EditChemicalForm id={id} initialData={chem} categories={categories ?? []} physicalStates={physicalStates ?? []} />
    </div>
  )
}
