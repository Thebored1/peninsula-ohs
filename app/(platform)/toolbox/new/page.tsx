import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { deliverTalk } from '@/app/actions/toolbox'
import DeliverTalkForm, { type DeliverTemplate } from './DeliverTalkForm'

export default async function NewToolboxPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organisation_id', orgId ?? '')
    .order('name')

  const { data: templatesRaw } = await supabase
    .from('toolbox_talk_templates')
    .select('id, title, estimated_duration_minutes, toolbox_talk_categories(name, colour_code), toolbox_talk_template_points(id, point_number, point_text, point_type)')
    .eq('organisation_id', orgId ?? '')
    .eq('is_active', true)
    .order('title')

  const { data: workers } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('organisation_id', orgId ?? '')
    .order('first_name')

  // Normalise Supabase relational array returns to single objects
  const templates: DeliverTemplate[] = (templatesRaw ?? []).map(t => {
    const catRaw = t.toolbox_talk_categories
    const cat = Array.isArray(catRaw)
      ? (catRaw[0] as { name: string; colour_code: string } | undefined) ?? null
      : (catRaw as { name: string; colour_code: string } | null)
    const pts = (t.toolbox_talk_template_points ?? []) as Array<{
      id: string; point_number: number; point_text: string; point_type: string
    }>
    return {
      id: t.id as string,
      title: t.title as string,
      estimated_duration_minutes: (t.estimated_duration_minutes ?? 10) as number,
      toolbox_talk_categories: cat,
      toolbox_talk_template_points: pts,
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/toolbox">Toolbox Talks</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Record Talk</BreadcrumbItem>
          </Breadcrumb>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '2rem' }}>
            Record Toolbox Talk
          </h1>
        </Column>
      </Grid>
      <DeliverTalkForm
        sites={sites ?? []}
        templates={templates}
        workers={workers ?? []}
        action={deliverTalk}
      />
    </div>
  )
}
