import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Grid, Column, Breadcrumb, BreadcrumbItem } from '@carbon/react'
import EmergencyContactForm from './EmergencyContactForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function NewEmergencyContactPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: worker } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('id', id)
    .single()

  if (!worker) notFound()

  const workerName = `${worker.first_name} ${worker.last_name}`

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/workers">Worker Profiles</BreadcrumbItem>
            <BreadcrumbItem href={`/workers/${id}`}>{workerName}</BreadcrumbItem>
            <BreadcrumbItem href={`/workers/${id}/emergency-contacts`}>Emergency Contacts</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New</BreadcrumbItem>
          </Breadcrumb>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Add Emergency Contact
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '2rem' }}>
            For {workerName}
          </p>
        </Column>
      </Grid>
      <EmergencyContactForm workerId={id} />
    </div>
  )
}
