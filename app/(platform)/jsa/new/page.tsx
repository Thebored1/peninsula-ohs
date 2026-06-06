import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import JsaForm from './JsaForm'
import { createJsa } from '@/app/actions/jsa'

export default async function NewJsaPage() {
  const supabase = await createClient()

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .order('name')

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/jsa">JSA / JHA Builder</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New JSA</BreadcrumbItem>
          </Breadcrumb>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '2rem' }}>
            New Job Safety Analysis
          </h1>
        </Column>
      </Grid>
      <JsaForm sites={sites ?? []} action={createJsa} />
    </div>
  )
}
