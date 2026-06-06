import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Grid, Column, InlineNotification } from '@carbon/react'
import { CheckInForm } from './CheckInForm'

export default async function WellbeingCheckInPage() {
  const supabase = await createClient()

  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p style={{ color: '#6f6f6f' }}>No organisation found.</p></div>

  const [{ data: sites }, { data: departments }] = await Promise.all([
    supabase
      .from('sites')
      .select('id, name')
      .eq('organisation_id', orgId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('departments')
      .select('id, name')
      .eq('organisation_id', orgId)
      .order('name'),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/wellbeing">Mental Health &amp; Wellbeing</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Check-In</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
              Wellbeing Check-In
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Rate how you&apos;re feeling today. Responses are anonymous — no personally identifiable information is stored.
            </p>
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <InlineNotification
              kind="info"
              title="Anonymous"
              subtitle="Your identity is not recorded with this check-in. Results are aggregated to help the organisation understand overall team wellbeing."
              lowContrast
            />
          </div>
        </Column>
      </Grid>
      <CheckInForm sites={sites ?? []} departments={departments ?? []} />
    </div>
  )
}
