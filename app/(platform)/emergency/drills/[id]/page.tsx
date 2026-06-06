import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column, Tile, Tag } from '@carbon/react'
import { CompleteDrillForm } from './CompleteDrillForm'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'green'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = { scheduled: 'blue', completed: 'green', cancelled: 'gray' }
  return map[status] ?? 'gray'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
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

export default async function DrillDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: drill } = await supabase
    .from('emergency_drills')
    .select('*, sites(name), emergency_response_plans(plan_number, title)')
    .eq('id', id)
    .single()

  if (!drill) notFound()

  const siteRaw = drill.sites
  const planRaw = drill.emergency_response_plans
  const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)
  const plan = Array.isArray(planRaw) ? (planRaw[0] as { plan_number: string | null; title: string } | undefined) ?? null : (planRaw as { plan_number: string | null; title: string } | null)

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/emergency">Emergency</BreadcrumbItem>
        <BreadcrumbItem href="/emergency/drills">Drills</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{drill.drill_number ?? id.slice(0, 8)}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            {drill.drill_number ?? '—'}
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>{drill.title}</h1>
          <Tag type={statusTag(drill.status)} size="md">{drill.status?.replace(/_/g, ' ')}</Tag>
        </div>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Drill Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Type">{drill.drill_type?.replace(/_/g, ' ') ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Site">{site?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Scheduled Date">
                    {drill.scheduled_date ? formatDate(drill.scheduled_date) : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Actual Date">
                    {drill.actual_date ? formatDate(drill.actual_date) : '—'}
                  </DetailRow>
                </Column>
                {plan && (
                  <Column sm={4} md={8} lg={16}>
                    <DetailRow label="Linked Plan">
                      <a href={`/emergency/plans/${plan}`} style={{ color: '#0f62fe', textDecoration: 'none' }}>
                        {plan.plan_number ? `${plan.plan_number} — ` : ''}{plan.title}
                      </a>
                    </DetailRow>
                  </Column>
                )}
                {drill.participants_count != null && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Participants">{drill.participants_count}</DetailRow>
                  </Column>
                )}
                {drill.duration_minutes != null && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Duration">{drill.duration_minutes} minutes</DetailRow>
                  </Column>
                )}
              </Grid>
            </div>
          </Tile>

          {drill.outcomes && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Outcomes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{drill.outcomes}</p>
              </div>
            </Tile>
          )}

          {drill.findings && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Findings</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{drill.findings}</p>
              </div>
            </Tile>
          )}
        </Column>

        {drill.status === 'scheduled' && (
          <Column sm={4} md={8} lg={8}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Complete Drill</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <CompleteDrillForm drillId={id} />
              </div>
            </Tile>
          </Column>
        )}
      </Grid>
    </div>
  )
}
