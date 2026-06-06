import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { ScheduleForm } from './ScheduleForm'
import { createSchedule } from '@/app/actions/inspection-schedules'

export default async function NewSchedulePage() {
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('inspection_templates')
    .select('id, name, inspection_types(name)')
    .eq('is_published', true)
    .eq('is_active', true)
    .order('name')

  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .order('first_name')

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/inspections">Inspections</BreadcrumbItem>
            <BreadcrumbItem href="/inspections/schedules">Schedules</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Schedule</BreadcrumbItem>
          </Breadcrumb>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '2rem',
            }}
          >
            Create Inspection Schedule
          </h1>
        </Column>
      </Grid>
      <ScheduleForm
        templates={templates ?? []}
        users={users ?? []}
        action={createSchedule}
      />
    </div>
  )
}
