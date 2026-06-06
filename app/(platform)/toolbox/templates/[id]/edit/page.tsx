import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { updateTemplate } from '@/app/actions/toolbox'
import TemplateForm from '../../TemplateForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: template } = await supabase
    .from('toolbox_talk_templates')
    .select(`
      id, title, description, estimated_duration_minutes, is_active, category_id,
      toolbox_talk_template_points(id, point_number, point_text, point_type)
    `)
    .eq('id', id)
    .single()

  if (!template) notFound()

  const { data: categories } = await supabase
    .from('toolbox_talk_categories')
    .select('id, name, colour_code')
    .order('display_order')

  const initial = {
    id: template.id,
    title: template.title,
    category_id: template.category_id ?? null,
    description: template.description ?? null,
    estimated_duration_minutes: template.estimated_duration_minutes ?? 10,
    is_active: template.is_active ?? true,
    points: (template.toolbox_talk_template_points ?? []) as Array<{
      id: string
      point_number: number
      point_text: string
      point_type: string
    }>,
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/toolbox">Toolbox Talks</BreadcrumbItem>
            <BreadcrumbItem href="/toolbox/templates">Templates</BreadcrumbItem>
            <BreadcrumbItem href={`/toolbox/templates/${id}`}>{template.title}</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Edit</BreadcrumbItem>
          </Breadcrumb>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '2rem' }}>
            Edit Template
          </h1>
        </Column>
      </Grid>
      <TemplateForm categories={categories ?? []} action={updateTemplate} initial={initial} />
    </div>
  )
}
