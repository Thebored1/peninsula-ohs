import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Tile,
  Tag,
  Breadcrumb,
  BreadcrumbItem,
  Button,
} from '@carbon/react'
import { updateWellbeingStatus } from '@/app/actions/wellbeing'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

function resourceTypeTag(type: string): TagType {
  const map: Record<string, TagType> = {
    eap: 'teal',
    helpline: 'blue',
    internal_support: 'cyan',
    article: 'gray',
    policy: 'purple',
    app: 'magenta',
  }
  return map[type] ?? 'gray'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p
        style={{
          fontSize: '0.75rem',
          color: '#6f6f6f',
          letterSpacing: '0.32px',
          marginBottom: '0.25rem',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WellbeingResourceDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: resource } = await supabase
    .from('wellbeing_resources')
    .select('*')
    .eq('id', id)
    .single()

  if (!resource) notFound()

  const isActive: boolean = resource.is_active ?? false
  const canToggle = true

  async function handleToggleStatus() {
    'use server'
    await updateWellbeingStatus(id, isActive ? 'false' : 'active')
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/wellbeing">Mental Health &amp; Wellbeing</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{resource.title}</BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <Tag type={resourceTypeTag(resource.resource_type)} size="md">
              {resource.resource_type?.replace(/_/g, ' ')}
            </Tag>
            <Tag type={isActive ? 'green' : 'gray'} size="md">
              {isActive ? 'Active' : 'Inactive'}
            </Tag>
            {resource.is_external && (
              <Tag type="blue" size="sm">External</Tag>
            )}
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.25rem',
            }}
          >
            {resource.title}
          </h1>
          {resource.created_at && (
            <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
              Added {formatDate(resource.created_at)}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          {canToggle && (
            <form action={handleToggleStatus}>
              <Button
                kind={isActive ? 'danger--ghost' : 'tertiary'}
                type="submit"
                size="sm"
              >
                {isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </form>
          )}
        </div>
      </div>

      <Grid condensed>
        {/* Main Details */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Resource Details
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <DetailRow label="Resource Type">
                <Tag type={resourceTypeTag(resource.resource_type)} size="sm">
                  {resource.resource_type?.replace(/_/g, ' ')}
                </Tag>
              </DetailRow>
              <DetailRow label="Status">
                <Tag type={isActive ? 'green' : 'gray'} size="sm">
                  {isActive ? 'Active' : 'Inactive'}
                </Tag>
              </DetailRow>
              <DetailRow label="Availability">
                {resource.is_external ? 'External provider' : 'Internal resource'}
              </DetailRow>
              {resource.website_url && (
                <DetailRow label="Website">
                  <a
                    href={resource.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#0f62fe', textDecoration: 'none', wordBreak: 'break-all' }}
                  >
                    {resource.website_url}
                  </a>
                </DetailRow>
              )}
            </div>
          </Tile>

          {/* Description */}
          {resource.description && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Description
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>
                  {resource.description}
                </p>
              </div>
            </Tile>
          )}
        </Column>

        {/* Contact Information */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Contact Information
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {!resource.contact_name && !resource.contact_phone && !resource.contact_email && !resource.website_url ? (
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>No contact details provided.</p>
              ) : (
                <>
                  {resource.contact_name && (
                    <DetailRow label="Contact Name">{resource.contact_name}</DetailRow>
                  )}
                  {resource.contact_phone && (
                    <DetailRow label="Phone">
                      <a
                        href={`tel:${resource.contact_phone}`}
                        style={{ color: '#0f62fe', textDecoration: 'none' }}
                      >
                        {resource.contact_phone}
                      </a>
                    </DetailRow>
                  )}
                  {resource.contact_email && (
                    <DetailRow label="Email">
                      <a
                        href={`mailto:${resource.contact_email}`}
                        style={{ color: '#0f62fe', textDecoration: 'none' }}
                      >
                        {resource.contact_email}
                      </a>
                    </DetailRow>
                  )}
                  {resource.website_url && (
                    <DetailRow label="Website">
                      <a
                        href={resource.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0f62fe', textDecoration: 'none', wordBreak: 'break-all' }}
                      >
                        {resource.website_url}
                      </a>
                    </DetailRow>
                  )}
                </>
              )}
            </div>
          </Tile>

          {/* Quick Access Card */}
          {(resource.contact_phone || resource.website_url) && (
            <Tile
              style={{
                padding: '1.5rem',
                marginBottom: '1rem',
                backgroundColor: '#f4f4f4',
                border: '1px solid #e0e0e0',
              }}
            >
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#525252',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.32px',
                }}
              >
                Quick Access
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {resource.contact_phone && (
                  <a href={`tel:${resource.contact_phone}`}>
                    <Button kind="primary" size="sm">
                      Call {resource.contact_phone}
                    </Button>
                  </a>
                )}
                {resource.website_url && (
                  <a href={resource.website_url} target="_blank" rel="noopener noreferrer">
                    <Button kind="tertiary" size="sm">
                      Visit Website
                    </Button>
                  </a>
                )}
              </div>
            </Tile>
          )}

          {/* Metadata */}
          <Tile style={{ padding: 0 }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Record Information
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <DetailRow label="Record ID">
                <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#525252' }}>
                  {resource.id}
                </span>
              </DetailRow>
              {resource.created_at && (
                <DetailRow label="Date Added">{formatDate(resource.created_at)}</DetailRow>
              )}
            </div>
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
