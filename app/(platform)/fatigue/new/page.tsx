import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { FatigueForm } from './FatigueForm'
import { logShift } from '@/app/actions/fatigue'

export default async function NewShiftLogPage() {
  const supabase = await createClient()

  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p style={{ color: '#6f6f6f' }}>No organisation found.</p></div>

  const [{ data: workers }, { data: sites }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .eq('organisation_id', orgId)
      .eq('is_active', true)
      .order('last_name'),
    supabase
      .from('sites')
      .select('id, name')
      .eq('organisation_id', orgId)
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/fatigue">Fatigue &amp; Shift Monitoring</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Log Shift</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>
              Log Shift
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.25rem' }}>
              Record a worker shift for fatigue monitoring
            </p>
          </div>
        </Column>
      </Grid>
      <FatigueForm
        workers={workers ?? []}
        sites={sites ?? []}
        action={logShift}
      />
    </div>
  )
}
