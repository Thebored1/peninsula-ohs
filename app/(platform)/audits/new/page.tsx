import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { AuditForm } from './AuditForm'
import { createAudit } from '@/app/actions/audits'

export default async function NewAuditPage() {
  const supabase = await createClient()

  const { data: auditTypes } = await supabase
    .from('audit_types')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order')

  const { data: templates } = await supabase
    .from('audit_templates')
    .select('id, name, standard_reference, audit_types(name)')
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
            <BreadcrumbItem href="/audits">Audits</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Schedule Audit</BreadcrumbItem>
          </Breadcrumb>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '2rem' }}>
            Schedule Audit
          </h1>
        </Column>
      </Grid>
      <AuditForm
        auditTypes={auditTypes ?? []}
        templates={templates ?? []}
        users={users ?? []}
        action={createAudit}
      />
    </div>
  )
}
