import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import RiskForm from './RiskForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ template_id?: string }>
}

export default async function NewRiskPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const orgId = await getOrgId()
  const { template_id } = await searchParams

  const [categoriesResult, likelihoodResult, consequenceResult, usersResult] = await Promise.all([
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
    orgId
      ? supabase
          .from('user_profiles')
          .select('id, first_name, last_name, display_name')
          .eq('organisation_id', orgId)
          .eq('is_active', true)
          .order('first_name', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const categories = categoriesResult.data ?? []
  const likelihoodLevels = likelihoodResult.data ?? []
  const consequenceLevels = consequenceResult.data ?? []
  const users = (usersResult.data ?? []) as { id: string; first_name: string | null; last_name: string | null; display_name: string | null }[]

  // If a template_id was provided, fetch the template risk for pre-population
  let defaultValues: Record<string, unknown> | undefined
  if (template_id) {
    const { data: template } = await supabase
      .from('risks')
      .select('title, category, hazard_description, people_at_risk, inherent_likelihood, inherent_consequence, controls_description, residual_likelihood, residual_consequence')
      .eq('id', template_id)
      .eq('is_template', true)
      .maybeSingle()

    if (template) {
      // Try to match the template's text category to a category_id in the loaded categories list
      const matchedCategory = categories.find(
        (c) => c.name.toLowerCase() === (template.category ?? '').toLowerCase()
      )
      defaultValues = {
        title: template.title ?? '',
        category_id: matchedCategory?.id ?? '',
        hazard_description: template.hazard_description ?? '',
        people_at_risk: Array.isArray(template.people_at_risk)
          ? (template.people_at_risk as string[]).join(', ')
          : (template.people_at_risk ?? ''),
        inherent_likelihood: template.inherent_likelihood ?? '',
        inherent_consequence: template.inherent_consequence ?? '',
        controls_description: template.controls_description ?? '',
        residual_likelihood: template.residual_likelihood ?? '',
        residual_consequence: template.residual_consequence ?? '',
      }
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/risks">Risk Register</BreadcrumbItem>
            {template_id && (
              <BreadcrumbItem href="/risks/templates">Risk Templates</BreadcrumbItem>
            )}
            <BreadcrumbItem isCurrentPage>New Risk</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Add Risk</h1>
            <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.25rem' }}>
              {defaultValues
                ? 'Risk pre-populated from template. Review and adjust before saving.'
                : 'Record a new risk in the register. Required fields are marked with *.'}
            </p>
          </div>
        </Column>
      </Grid>
      <RiskForm
        categories={categories}
        likelihoodLevels={likelihoodLevels}
        consequenceLevels={consequenceLevels}
        users={users}
        defaultValues={defaultValues}
      />
    </div>
  )
}
