import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column, Tile, Tag, Button } from '@carbon/react'
import { setAllClear } from '@/app/actions/emergency'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = { active: 'red', all_clear: 'cyan', closed: 'green' }
  return map[status] ?? 'gray'
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
        {label}
      </p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ActivationDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: activation } = await supabase
    .from('emergency_activations')
    .select('*, sites(name), emergency_response_plans(plan_number, title), user_profiles!activated_by(first_name, last_name)')
    .eq('id', id)
    .single()

  if (!activation) notFound()

  const siteRaw = activation.sites
  const planRaw = activation.emergency_response_plans
  const activatorRaw = activation.user_profiles
  const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)
  const plan = Array.isArray(planRaw) ? (planRaw[0] as { plan_number: string | null; title: string } | undefined) ?? null : (planRaw as { plan_number: string | null; title: string } | null)
  const activator = Array.isArray(activatorRaw) ? (activatorRaw[0] as { first_name: string; last_name: string } | undefined) ?? null : (activatorRaw as { first_name: string; last_name: string } | null)

  const isActive = activation.status === 'active'

  async function handleAllClear() {
    'use server'
    await setAllClear(id)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/emergency">Emergency</BreadcrumbItem>
        <BreadcrumbItem href="/emergency/activations">Activations</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{activation.activation_number ?? id.slice(0, 8)}</BreadcrumbItem>
      </Breadcrumb>

      {isActive && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.5rem',
          backgroundColor: '#fff1f1',
          border: '1px solid #da1e28',
          borderLeft: '4px solid #da1e28',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#da1e28' }}>
              EMERGENCY ACTIVE — {activation.emergency_type}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#750e13' }}>
              Activated {formatDateTime(activation.activated_at)}
            </p>
          </div>
          <form action={handleAllClear}>
            <Button kind="danger" type="submit" size="sm">Issue All Clear</Button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            {activation.activation_number ?? '—'}
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>
            {activation.emergency_type}
          </h1>
          <Tag type={statusTag(activation.status)} size="md">
            {activation.status?.replace(/_/g, ' ')}
          </Tag>
        </div>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Activation Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Emergency Type">{activation.emergency_type}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Site">{site?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Activated">{formatDateTime(activation.activated_at)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="All Clear">
                    {activation.all_clear_at ? formatDateTime(activation.all_clear_at) : '—'}
                  </DetailRow>
                </Column>
                {activator && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Activated By">{activator.first_name} {activator.last_name}</DetailRow>
                  </Column>
                )}
                {activation.total_personnel != null && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Total Personnel">{activation.total_personnel}</DetailRow>
                  </Column>
                )}
                {activation.accounted_for != null && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Accounted For">{activation.accounted_for}</DetailRow>
                  </Column>
                )}
                {plan && (
                  <Column sm={4} md={8} lg={16}>
                    <DetailRow label="Response Plan">
                      <a href={`/emergency/plans/${id}`} style={{ color: '#0f62fe', textDecoration: 'none' }}>
                        {plan.plan_number ? `${plan.plan_number} — ` : ''}{plan.title}
                      </a>
                    </DetailRow>
                  </Column>
                )}
              </Grid>
            </div>
          </Tile>

          {activation.description && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Description</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{activation.description}</p>
              </div>
            </Tile>
          )}
        </Column>
      </Grid>
    </div>
  )
}
