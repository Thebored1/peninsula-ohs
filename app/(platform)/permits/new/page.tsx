import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { PermitForm } from './PermitForm'
import { createPermit } from '@/app/actions/permits'

export default async function NewPermitPage() {
  const supabase = await createClient()

  const { data: permitTypes } = await supabase
    .from('permit_types')
    .select('id, code, name, description, rescue_plan_required, isolation_required, max_duration_hours')
    .eq('is_active', true)
    .order('display_order')

  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .order('first_name')

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/permits">Permits to Work</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Apply for Permit</BreadcrumbItem>
          </Breadcrumb>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '2rem' }}>
            Apply for Permit to Work
          </h1>
        </Column>
      </Grid>
      <PermitForm permitTypes={permitTypes ?? []} users={users ?? []} action={createPermit} />
    </div>
  )
}
