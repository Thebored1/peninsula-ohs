import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Tile,
  Tag,
  Breadcrumb,
  BreadcrumbItem,
  InlineNotification,
  Button,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react'
import { closeIncident } from '@/app/actions/incidents'
import { createInvestigation } from '@/app/actions/investigations'

type TagType =
  | 'gray'
  | 'blue'
  | 'teal'
  | 'purple'
  | 'cyan'
  | 'magenta'
  | 'red'
  | 'green'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    draft: 'gray',
    cancelled: 'gray',
    submitted: 'blue',
    triaged: 'teal',
    under_investigation: 'purple',
    capa_in_progress: 'cyan',
    pending_approval: 'blue',
    closed: 'green',
  }
  return map[status] ?? 'gray'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.125rem 0.5rem',
        borderRadius: '2px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: value ? '#defbe6' : '#f4f4f4',
        color: value ? '#24a148' : '#525252',
        border: `1px solid ${value ? '#24a148' : '#c6c6c6'}`,
      }}
    >
      {value ? 'Yes' : 'No'}
    </span>
  )
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

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: incident } = await supabase
    .from('incidents')
    .select(
      `id, incident_number, title, status, incident_date, incident_time,
       exact_location, description, immediate_actions_taken,
       was_injury_involved, regulatory_reportable, regulatory_submitted,
       closure_notes, closed_at,
       incident_types(name),
       severity_levels(name, colour_code),
       created_by`
    )
    .eq('id', id)
    .single()

  if (!incident) notFound()

  // Fetch reporter's email
  const reporterProfile = incident.created_by
    ? await supabase
        .from('user_profiles')
        .select('first_name, last_name, email')
        .eq('id', incident.created_by)
        .single()
    : null
  const reporter = reporterProfile?.data

  // Fetch people involved
  const { data: people } = await supabase
    .from('incident_people_involved')
    .select('id, full_name, person_type, job_title, was_injured')
    .eq('incident_id', id)
    .order('created_at', { ascending: true })

  // Fetch investigation
  const { data: investigations } = await supabase
    .from('investigations')
    .select('id, status, investigator_id, investigation_summary, investigation_number')
    .eq('incident_id', id)
    .limit(1)

  const investigation = investigations?.[0] ?? null

  // Fetch investigator profile if exists
  let investigatorName: string | null = null
  if (investigation?.investigator_id) {
    const { data: inv } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('id', investigation.investigator_id)
      .single()
    if (inv) {
      investigatorName = `${inv.first_name} ${inv.last_name}`
    }
  }

  const typeRaw = incident.incident_types
  const severityRaw = incident.severity_levels
  const type = Array.isArray(typeRaw) ? (typeRaw[0] as { name: string } | undefined) ?? null : (typeRaw as { name: string } | null)
  const severity = Array.isArray(severityRaw) ? (severityRaw[0] as { name: string; colour_code: string } | undefined) ?? null : (severityRaw as { name: string; colour_code: string } | null)

  const canClose = !['closed', 'cancelled'].includes(incident.status)

  async function handleClose(formData: FormData) {
    'use server'
    const notes = formData.get('closure_notes') as string
    await closeIncident(id, notes)
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/incidents">Incidents</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          {incident.incident_number ?? id.slice(0, 8)}
        </BreadcrumbItem>
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
          <p
            style={{
              fontSize: '0.75rem',
              color: '#6f6f6f',
              letterSpacing: '0.32px',
              marginBottom: '0.25rem',
              textTransform: 'uppercase',
            }}
          >
            {incident.incident_number ?? '—'}
          </p>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.75rem',
            }}
          >
            {incident.title}
          </h1>
          <Tag type={statusTag(incident.status)} size="md">
            {incident.status?.replace(/_/g, ' ')}
          </Tag>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button kind="ghost" href={`/incidents/${id}/edit`} size="sm">
            Edit
          </Button>
          {canClose && (
            <form action={handleClose}>
              <input
                type="hidden"
                name="closure_notes"
                value="Closed via incident detail page."
              />
              <Button kind="danger--ghost" type="submit" size="sm">
                Close Incident
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Regulatory warning */}
      {incident.regulatory_reportable && !incident.regulatory_submitted && (
        <div style={{ marginBottom: '1.5rem' }}>
          <InlineNotification
            kind="warning"
            title="Regulatory Submission Pending"
            subtitle="This incident has been flagged as regulatory reportable but has not yet been submitted to the relevant authority."
            lowContrast
          />
        </div>
      )}

      <Grid condensed>
        {/* Details */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Incident Details
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Type">{type?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Severity">
                    {severity ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: severity.colour_code,
                          }}
                        />
                        <span>{severity.name}</span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Date">
                    {incident.incident_date ? formatDate(incident.incident_date) : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Time">{incident.incident_time ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Location">{incident.exact_location ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Injury Involved">
                    <YesNoBadge value={incident.was_injury_involved} />
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Reported By">
                    {reporter
                      ? `${reporter.first_name} ${reporter.last_name} (${reporter.email})`
                      : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Regulatory Reportable">
                    <YesNoBadge value={incident.regulatory_reportable} />
                  </DetailRow>
                </Column>
              </Grid>
            </div>
          </Tile>

          {/* Description */}
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
                {incident.description || '—'}
              </p>
            </div>
          </Tile>

          {/* Immediate Actions */}
          {incident.immediate_actions_taken && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Immediate Actions Taken
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>
                  {incident.immediate_actions_taken}
                </p>
              </div>
            </Tile>
          )}
        </Column>

        {/* Right column: People & Investigation */}
        <Column sm={4} md={8} lg={8}>
          {/* People Involved */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                People Involved
              </h2>
            </div>
            {!people || people.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  color: '#6f6f6f',
                  fontSize: '0.875rem',
                }}
              >
                No people recorded
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Job Title</TableHeader>
                      <TableHeader>Injured</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {people.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.full_name}</TableCell>
                        <TableCell>{p.person_type?.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{p.job_title ?? '—'}</TableCell>
                        <TableCell>
                          <YesNoBadge value={p.was_injured} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Tile>

          {/* Investigation */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Investigation
              </h2>
              {investigation && (
                <a
                  href={`/investigations/${investigation.id}`}
                  style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
                >
                  View investigation
                </a>
              )}
            </div>
            <div style={{ padding: '1.5rem' }}>
              {!investigation ? (
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6f6f6f', marginBottom: '1rem' }}>No investigation started</p>
                  <form action={async () => { 'use server'; await createInvestigation(id) }}>
                    <button
                      type="submit"
                      style={{
                        fontSize: '0.875rem',
                        color: '#0f62fe',
                        background: 'none',
                        border: '1px solid #0f62fe',
                        borderRadius: '2px',
                        padding: '0.375rem 0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Start Investigation
                    </button>
                  </form>
                </div>
              ) : (
                <div>
                  <DetailRow label="Investigation #">
                    {investigation.investigation_number ?? '—'}
                  </DetailRow>
                  <DetailRow label="Status">
                    <Tag type="blue" size="sm">
                      {investigation.status?.replace(/_/g, ' ')}
                    </Tag>
                  </DetailRow>
                  {investigatorName && (
                    <DetailRow label="Investigator">{investigatorName}</DetailRow>
                  )}
                  {investigation.investigation_summary && (
                    <DetailRow label="Summary">
                      {investigation.investigation_summary}
                    </DetailRow>
                  )}
                </div>
              )}
            </div>
          </Tile>

          {/* Closure notes if closed */}
          {incident.status === 'closed' && incident.closure_notes && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Closure Notes
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>
                  {incident.closure_notes}
                </p>
                {incident.closed_at && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#6f6f6f',
                      marginTop: '0.5rem',
                    }}
                  >
                    Closed on {formatDate(incident.closed_at)}
                  </p>
                )}
              </div>
            </Tile>
          )}
        </Column>
      </Grid>
    </div>
  )
}
