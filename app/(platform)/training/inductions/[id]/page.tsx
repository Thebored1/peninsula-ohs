import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column, Tile, Tag } from '@carbon/react'
import Link from 'next/link'
import { AssignInductionPanel } from './AssignInductionPanel'

interface PageProps { params: Promise<{ id: string }> }

function formatDate(iso: string | null) {
  if (!iso) return '—'
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

const APPLIES_LABELS: Record<string, string> = {
  all: 'Everyone',
  employees: 'Employees',
  contractors: 'Contractors',
  visitors: 'Visitors',
}

export default async function InductionDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: program } = await supabase
    .from('induction_programs')
    .select('*, sites!site_id(name)')
    .eq('id', id)
    .single()

  if (!program) notFound()

  const { data: steps } = await supabase
    .from('induction_steps')
    .select('id, step_number, title, description, is_mandatory')
    .eq('program_id', id)
    .order('step_number', { ascending: true })

  const { data: completions } = await supabase
    .from('induction_completions')
    .select('id, status, completed_at, created_at, user_profiles!worker_id(first_name, last_name)')
    .eq('program_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: workers } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('is_active', true)
    .order('last_name', { ascending: true })

  const siteRaw = program.sites
  const site = Array.isArray(siteRaw)
    ? (siteRaw[0] as { name: string } | undefined) ?? null
    : (siteRaw as { name: string } | null)

  function completionStatusTag(status: string): 'gray' | 'blue' | 'green' {
    if (status === 'completed') return 'green'
    if (status === 'in_progress') return 'blue'
    return 'gray'
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/training">Training</BreadcrumbItem>
        <BreadcrumbItem href="/training/inductions">Induction Programs</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{program.name}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            {program.name}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {APPLIES_LABELS[program.applies_to ?? 'all']} · {site?.name ?? 'All sites'}
          </p>
        </div>
        <Tag type={program.is_active ? 'green' : 'gray'} size="md">
          {program.is_active ? 'Active' : 'Inactive'}
        </Tag>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Program Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Applies To">
                    {APPLIES_LABELS[program.applies_to ?? 'all']}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Site">{site?.name ?? 'All sites'}</DetailRow>
                </Column>
              </Grid>
              {program.description && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.5rem' }}>Description</p>
                  <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.5 }}>{program.description}</p>
                </div>
              )}
            </div>
          </Tile>

          {/* Steps */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Steps ({steps?.length ?? 0})
              </h2>
            </div>
            {!steps || steps.length === 0 ? (
              <div style={{ padding: '1.5rem', fontSize: '0.875rem', color: '#6f6f6f' }}>
                No steps defined for this program
              </div>
            ) : (
              <div>
                {steps.map((step, i) => (
                  <div
                    key={step.id}
                    style={{
                      padding: '0.875rem 1.5rem',
                      borderBottom: i < steps.length - 1 ? '1px solid #f4f4f4' : 'none',
                      display: 'flex',
                      gap: '1rem',
                    }}
                  >
                    <div style={{
                      minWidth: '1.75rem',
                      height: '1.75rem',
                      borderRadius: '50%',
                      backgroundColor: '#f4f4f4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#525252',
                      flexShrink: 0,
                    }}>
                      {step.step_number}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.125rem' }}>
                        {step.title}
                        {step.is_mandatory && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#da1e28' }}>Required</span>
                        )}
                      </p>
                      {step.description && (
                        <p style={{ fontSize: '0.75rem', color: '#6f6f6f', lineHeight: 1.4 }}>{step.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tile>
        </Column>

        <Column sm={4} md={8} lg={8}>
          {/* Assign induction */}
          <AssignInductionPanel programId={id} workers={workers ?? []} />

          {/* Completions */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Completions ({completions?.length ?? 0})
              </h2>
            </div>
            {!completions || completions.length === 0 ? (
              <div style={{ padding: '1.5rem', fontSize: '0.875rem', color: '#6f6f6f', textAlign: 'center' }}>
                No workers assigned yet
              </div>
            ) : (
              <div>
                {completions.map((c, i) => {
                  const workerRaw = c.user_profiles
                  const worker = Array.isArray(workerRaw)
                    ? (workerRaw[0] as { first_name: string; last_name: string } | undefined) ?? null
                    : (workerRaw as { first_name: string; last_name: string } | null)
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.875rem 1.5rem',
                        borderBottom: i < completions.length - 1 ? '1px solid #f4f4f4' : 'none',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.125rem' }}>
                          {worker ? `${worker.first_name} ${worker.last_name}` : '—'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                          {c.status === 'completed' ? `Completed ${formatDate(c.completed_at)}` : `Assigned ${formatDate(c.created_at)}`}
                        </p>
                      </div>
                      <Tag type={completionStatusTag(c.status)} size="sm">
                        {c.status.replace(/_/g, ' ')}
                      </Tag>
                    </div>
                  )
                })}
              </div>
            )}
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
