import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column, Tile, Tag, Button } from '@carbon/react'
import { updatePlanStatus } from '@/app/actions/emergency'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    draft: 'gray',
    active: 'green',
    under_review: 'cyan',
    archived: 'gray',
  }
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

export default async function EmergencyPlanDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('emergency_response_plans')
    .select('*, emergency_types(name, colour_code), sites(name)')
    .eq('id', id)
    .single()

  if (!plan) notFound()

  const { data: steps } = await supabase
    .from('erp_response_steps')
    .select('*')
    .eq('plan_id', id)
    .order('step_number', { ascending: true })

  const typeRaw = plan.emergency_types
  const siteRaw = plan.sites
  const etype = Array.isArray(typeRaw) ? (typeRaw[0] as { name: string; colour_code: string } | undefined) ?? null : (typeRaw as { name: string; colour_code: string } | null)
  const site = Array.isArray(siteRaw) ? (siteRaw[0] as { name: string } | undefined) ?? null : (siteRaw as { name: string } | null)

  async function handleActivate() {
    'use server'
    await updatePlanStatus(id, 'active')
  }
  async function handleArchive() {
    'use server'
    await updatePlanStatus(id, 'archived')
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/emergency">Emergency</BreadcrumbItem>
        <BreadcrumbItem href="/emergency/plans">Response Plans</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{plan.plan_number ?? id.slice(0, 8)}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            {plan.plan_number ?? '—'}
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>
            {plan.title}
          </h1>
          <Tag type={statusTag(plan.status)} size="md">
            {plan.status?.replace(/_/g, ' ')}
          </Tag>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {plan.status !== 'active' && plan.status !== 'archived' && (
            <form action={handleActivate}>
              <Button kind="primary" type="submit" size="sm">Activate Plan</Button>
            </form>
          )}
          {plan.status === 'active' && (
            <form action={handleArchive}>
              <Button kind="ghost" type="submit" size="sm">Archive</Button>
            </form>
          )}
        </div>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Plan Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Emergency Type">
                    {etype ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: etype.colour_code }} />
                        <span>{etype.name}</span>
                      </div>
                    ) : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Site">{site?.name ?? 'All sites'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Version">{plan.version_number ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Next Review">
                    {plan.next_review_date ? formatDate(plan.next_review_date) : '—'}
                  </DetailRow>
                </Column>
                {plan.last_reviewed_date && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Last Reviewed">{formatDate(plan.last_reviewed_date)}</DetailRow>
                  </Column>
                )}
                <Column sm={4} md={8} lg={16}>
                  <DetailRow label="Created">{formatDate(plan.created_at)}</DetailRow>
                </Column>
              </Grid>
            </div>
          </Tile>

          {plan.description && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Description</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{plan.description}</p>
              </div>
            </Tile>
          )}
        </Column>

        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Response Steps</h2>
            </div>
            {!steps || steps.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No response steps defined
              </div>
            ) : (
              <div style={{ padding: '1.5rem' }}>
                {steps.map((step) => (
                  <div key={step.id} style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid #f4f4f4',
                  }}>
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      backgroundColor: '#0f62fe',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {step.step_number}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.25rem' }}>{step.action}</p>
                      {step.responsible_role && (
                        <p style={{ fontSize: '0.75rem', color: '#525252' }}>Responsible: {step.responsible_role}</p>
                      )}
                      {step.timeframe && (
                        <p style={{ fontSize: '0.75rem', color: '#525252' }}>Timeframe: {step.timeframe}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
