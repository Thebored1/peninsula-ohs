import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { PpeForm } from './PpeForm'

export default async function NewPpePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user!.id)
    .single()

  const [{ data: workers }, { data: ppeItems }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, first_name, last_name, job_title')
      .eq('organisation_id', profile!.organisation_id)
      .eq('is_active', true)
      .order('last_name', { ascending: true }),
    supabase
      .from('ppe_items')
      .select('id, brand, model, size, quantity_available, ppe_type:ppe_type_id(name)')
      .eq('organisation_id', profile!.organisation_id)
      .gt('quantity_available', 0)
      .order('created_at', { ascending: false }),
  ])

  // Flatten ppe_type name into each item for the form
  const ppeItemsMapped = (ppeItems ?? []).map((item) => {
    const ppeTypeRaw = item.ppe_type
    const ppeType = Array.isArray(ppeTypeRaw)
      ? (ppeTypeRaw[0] as { name: string } | undefined) ?? null
      : (ppeTypeRaw as { name: string } | null)
    const label = [ppeType?.name, item.brand, item.model, item.size]
      .filter(Boolean)
      .join(' — ')
    return {
      id: item.id,
      label: label || 'PPE Item',
      quantity_available: item.quantity_available,
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/ppe">PPE Issuances</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Issue PPE</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 400,
                color: '#161616',
                marginBottom: '0.25rem',
              }}
            >
              Issue PPE
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Record PPE issued to a worker
            </p>
          </div>
        </Column>
      </Grid>
      <PpeForm
        workers={(workers ?? []).map((w) => ({
          id: w.id,
          name: `${w.first_name} ${w.last_name}`,
          job_title: w.job_title ?? null,
        }))}
        ppeItems={ppeItemsMapped}
      />
    </div>
  )
}
