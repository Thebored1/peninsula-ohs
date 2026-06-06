import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { SpeakUpForm } from './SpeakUpForm'

export default async function NewSpeakUpPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user!.id)
    .single()

  const [{ data: categories }, { data: sites }] = await Promise.all([
    supabase
      .from('speak_up_categories')
      .select('id, name, description')
      .eq('organisation_id', profile!.organisation_id)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('sites')
      .select('id, name')
      .eq('organisation_id', profile!.organisation_id)
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/speak-up">Speak-Up Reports</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Submit Report</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 400,
                color: '#161616',
                marginBottom: '0.25rem',
              }}
            >
              Submit Anonymous Report
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Report a concern, misconduct, or safety issue confidentially
            </p>
          </div>
        </Column>
      </Grid>
      <SpeakUpForm
        categories={categories ?? []}
        sites={sites ?? []}
      />
    </div>
  )
}
