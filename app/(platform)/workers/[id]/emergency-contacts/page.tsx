import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Tag,
} from '@carbon/react'
import { Add } from '@carbon/icons-react'
import Link from 'next/link'
import { DataTableClient } from '@/components/table/DataTableClient'
import type { ColDef } from '@/components/table/DataTableClient'

interface PageProps { params: Promise<{ id: string }> }

export default async function EmergencyContactsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: worker } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('id', id)
    .single()

  if (!worker) notFound()

  const { data: contacts } = await supabase
    .from('emergency_contacts')
    .select('id, contact_name, relationship, phone_primary, phone_secondary, email, is_primary, notes, created_at')
    .eq('worker_id', id)
    .order('is_primary', { ascending: false })
    .order('contact_name', { ascending: true })

  const rows = (contacts ?? []).map(c => ({
    id: c.id,
    contact_name: c.contact_name,
    relationship: c.relationship,
    phone_primary: c.phone_primary,
    phone_secondary: c.phone_secondary ?? '—',
    email: c.email ?? '—',
    is_primary: c.is_primary,
  }))

  const columns: ColDef[] = [
    { key: 'contact_name', header: 'Contact Name' },
    { key: 'relationship', header: 'Relationship' },
    { key: 'phone_primary', header: 'Primary Phone' },
    { key: 'phone_secondary', header: 'Secondary Phone' },
    { key: 'email', header: 'Email' },
    {
      key: 'is_primary',
      header: 'Primary Contact',
      cellConfig: {
        as: 'bool_tag',
        trueType: 'green',
        trueLabel: 'Primary',
        falseType: 'gray',
        falseLabel: 'Secondary',
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      cellConfig: {
        as: 'view_link',
        prefix: `/workers/${id}/emergency-contacts/`,
      },
    },
  ]

  const workerName = `${worker.first_name} ${worker.last_name}`

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/workers">Worker Profiles</BreadcrumbItem>
            <BreadcrumbItem href={`/workers/${id}`}>{workerName}</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Emergency Contacts</BreadcrumbItem>
          </Breadcrumb>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
                Emergency Contacts
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#525252' }}>
                {workerName} — {(contacts ?? []).length} contact{(contacts ?? []).length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link href={`/workers/${id}/emergency-contacts/new`}>
              <Button renderIcon={Add} size="md">Add Emergency Contact</Button>
            </Link>
          </div>
        </Column>

        <Column sm={4} md={8} lg={16}>
          {rows.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              border: '1px dashed #e0e0e0',
              backgroundColor: '#f4f4f4',
            }}>
              <p style={{ fontSize: '1rem', color: '#525252', marginBottom: '0.5rem' }}>No emergency contacts recorded</p>
              <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>
                Add at least one emergency contact for this worker.
              </p>
            </div>
          ) : (
            <DataTableClient
              id="emergency-contacts-table"
              rows={rows}
              columns={columns}
              searchPlaceholder="Search contacts..."
            />
          )}
        </Column>
      </Grid>
    </div>
  )
}
