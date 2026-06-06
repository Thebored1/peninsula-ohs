import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { AuditTemplateForm } from './AuditTemplateForm'
import { createAuditTemplate } from '@/app/actions/audit-templates'

export default async function NewAuditTemplatePage() {
  const supabase = await createClient()

  const { data: auditTypes } = await supabase
    .from('audit_types')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order')

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/audits">Audits</BreadcrumbItem>
            <BreadcrumbItem href="/audits/templates">Templates</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Template</BreadcrumbItem>
          </Breadcrumb>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '2rem' }}>
            Create Audit Template
          </h1>
        </Column>
      </Grid>
      <AuditTemplateForm auditTypes={auditTypes ?? []} action={createAuditTemplate} />
    </div>
  )
}
