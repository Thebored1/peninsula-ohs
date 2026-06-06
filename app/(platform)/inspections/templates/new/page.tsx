import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { TemplateForm } from './TemplateForm'
import { createTemplate } from '@/app/actions/inspection-templates'

export default async function NewTemplatePage() {
  const supabase = await createClient()

  const { data: inspectionTypes } = await supabase
    .from('inspection_types')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order')

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/inspections">Inspections</BreadcrumbItem>
            <BreadcrumbItem href="/inspections/templates">Templates</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Template</BreadcrumbItem>
          </Breadcrumb>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '2rem',
            }}
          >
            Create Inspection Template
          </h1>
        </Column>
      </Grid>
      <TemplateForm inspectionTypes={inspectionTypes ?? []} action={createTemplate} />
    </div>
  )
}
