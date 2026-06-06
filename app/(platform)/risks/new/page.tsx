import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import RiskForm from './RiskForm'

export default async function NewRiskPage() {
  const supabase = await createClient()

  const [categoriesResult, likelihoodResult, consequenceResult] = await Promise.all([
    supabase
      .from('risk_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('risk_likelihood_levels')
      .select('level_number, name, description')
      .eq('is_active', true)
      .order('level_number', { ascending: true }),
    supabase
      .from('risk_consequence_levels')
      .select('level_number, name, description')
      .eq('is_active', true)
      .order('level_number', { ascending: true }),
  ])

  const categories = categoriesResult.data ?? []
  const likelihoodLevels = likelihoodResult.data ?? []
  const consequenceLevels = consequenceResult.data ?? []

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/risks">Risk Register</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Risk</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Add Risk</h1>
            <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.25rem' }}>
              Record a new risk in the register. Required fields are marked with *.
            </p>
          </div>
        </Column>
      </Grid>
      <RiskForm
        categories={categories}
        likelihoodLevels={likelihoodLevels}
        consequenceLevels={consequenceLevels}
      />
    </div>
  )
}
