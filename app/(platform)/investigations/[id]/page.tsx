import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem, Button,
} from '@carbon/react'
import { updateInvestigation } from '@/app/actions/investigations'

type TagType = 'blue' | 'green' | 'gray' | 'purple' | 'teal' | 'red'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = { open: 'blue', in_progress: 'purple', completed: 'teal', closed: 'green', cancelled: 'gray' }
  return map[status] ?? 'gray'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{label}</p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps { params: Promise<{ id: string }> }

export default async function InvestigationDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: inv } = await supabase
    .from('investigations')
    .select(`
      id, investigation_number, status, due_date,
      investigation_summary, findings, root_cause,
      started_at, completed_at, created_at,
      incidents!incident_id(id, incident_number, title),
      user_profiles!investigator_id(first_name, last_name, email)
    `)
    .eq('id', id)
    .single()

  if (!inv) notFound()

  const incidentRaw = inv.incidents
  const profRaw = inv.user_profiles
  const incident = Array.isArray(incidentRaw) ? (incidentRaw[0] as { id: string; incident_number: string; title: string } | undefined) ?? null : (incidentRaw as { id: string; incident_number: string; title: string } | null)
  const prof = Array.isArray(profRaw) ? (profRaw[0] as { first_name: string; last_name: string; email: string } | undefined) ?? null : (profRaw as { first_name: string; last_name: string; email: string } | null)

  const canClose = !['closed', 'cancelled', 'completed'].includes(inv.status)

  async function handleClose() {
    'use server'
    const formData = new FormData()
    formData.set('status', 'completed')
    await updateInvestigation(id, formData)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/investigations">Investigations</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{inv.investigation_number ?? id.slice(0, 8)}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            {inv.investigation_number ?? '—'}
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>
            {incident ? `Investigation: ${incident.title}` : 'Investigation'}
          </h1>
          <Tag type={statusTag(inv.status)} size="md">{inv.status.replace(/_/g, ' ')}</Tag>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <Button kind="ghost" href={`/investigations/${id}/edit`} size="sm">Edit</Button>
          {canClose && (
            <form action={handleClose}>
              <Button kind="primary" type="submit" size="sm">Mark Complete</Button>
            </form>
          )}
        </div>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {incident && (
                <DetailRow label="Linked Incident">
                  <a href={`/incidents/${incident.id}`} style={{ color: '#0f62fe', textDecoration: 'none' }}>
                    {incident.incident_number} — {incident.title}
                  </a>
                </DetailRow>
              )}
              <DetailRow label="Investigator">
                {prof ? `${prof.first_name} ${prof.last_name} (${prof.email})` : '—'}
              </DetailRow>
              <DetailRow label="Due Date">{formatDate(inv.due_date)}</DetailRow>
              <DetailRow label="Started">{formatDate(inv.started_at)}</DetailRow>
              <DetailRow label="Completed">{formatDate(inv.completed_at)}</DetailRow>
            </div>
          </Tile>

          {inv.investigation_summary && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Summary</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{inv.investigation_summary}</p>
              </div>
            </Tile>
          )}
        </Column>

        <Column sm={4} md={8} lg={8}>
          {inv.findings && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Findings</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{inv.findings}</p>
              </div>
            </Tile>
          )}
          {inv.root_cause && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Root Cause</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>{inv.root_cause}</p>
              </div>
            </Tile>
          )}
          {!inv.findings && !inv.root_cause && (
            <Tile style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>
                No findings recorded yet.{' '}
                <a href={`/investigations/${id}/edit`} style={{ color: '#0f62fe', textDecoration: 'none' }}>Add findings →</a>
              </p>
            </Tile>
          )}
        </Column>
      </Grid>
    </div>
  )
}
