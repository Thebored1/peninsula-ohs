import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { createTemplate } from '@/app/actions/toolbox'
import TemplateForm from '../TemplateForm'

export default async function NewTemplatePage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('toolbox_talk_categories')
    .select('id, name, colour_code')
    .order('display_order')

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/toolbox">Toolbox Talks</BreadcrumbItem>
            <BreadcrumbItem href="/toolbox/templates">Templates</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Template</BreadcrumbItem>
          </Breadcrumb>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '2rem' }}>
            New Toolbox Talk Template
          </h1>
        </Column>
      </Grid>
      <TemplateForm categories={categories ?? []} action={createTemplate} />
    </div>
  )
}
