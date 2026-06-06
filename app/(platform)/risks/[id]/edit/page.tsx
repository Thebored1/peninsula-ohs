import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { EditRiskForm } from './EditForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function EditRiskPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: risk }, { data: categories }, { data: likelihoodLevels }, { data: consequenceLevels }] = await Promise.all([
    supabase
      .from('risks')
      .select('title, category_id, hazard_description, location_activity, people_at_risk, likelihood_score, consequence_score, existing_controls_summary, review_frequency, notes')
      .eq('id', id)
      .single(),
    supabase.from('risk_categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('risk_likelihood_levels').select('level_number, name').order('level_number'),
    supabase.from('risk_consequence_levels').select('level_number, name').order('level_number'),
  ])

  if (!risk) notFound()

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/risks">Risk Register</BreadcrumbItem>
            <BreadcrumbItem href={`/risks/${id}`}>Details</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Edit</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Edit Risk</h1>
          </div>
        </Column>
      </Grid>
      <EditRiskForm
        id={id}
        initialData={risk}
        categories={categories ?? []}
        likelihoodLevels={likelihoodLevels ?? []}
        consequenceLevels={consequenceLevels ?? []}
      />
    </div>
  )
}
