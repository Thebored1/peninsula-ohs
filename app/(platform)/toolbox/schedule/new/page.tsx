import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { scheduleTalk } from '@/app/actions/toolbox'
import ScheduleForm, { type ScheduleTemplate } from './ScheduleForm'

export default async function NewSchedulePage() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data: templatesRaw } = await supabase
    .from('toolbox_talk_templates')
    .select('id, title, toolbox_talk_categories(name)')
    .eq('organisation_id', orgId ?? '')
    .eq('is_active', true)
    .order('title')

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organisation_id', orgId ?? '')
    .order('name')

  const { data: workers } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('organisation_id', orgId ?? '')
    .order('first_name')

  const templates: ScheduleTemplate[] = (templatesRaw ?? []).map(t => {
    const catRaw = t.toolbox_talk_categories
    const cat = Array.isArray(catRaw)
      ? (catRaw[0] as { name: string } | undefined) ?? null
      : (catRaw as { name: string } | null)
    return {
      id: t.id as string,
      title: t.title as string,
      toolbox_talk_categories: cat,
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/toolbox">Toolbox Talks</BreadcrumbItem>
            <BreadcrumbItem href="/toolbox/schedule">Schedule</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Schedule Talk</BreadcrumbItem>
          </Breadcrumb>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '2rem' }}>
            Schedule a Toolbox Talk
          </h1>
        </Column>
      </Grid>
      <ScheduleForm
        templates={templates}
        sites={sites ?? []}
        workers={workers ?? []}
        action={scheduleTalk}
      />
    </div>
  )
}
