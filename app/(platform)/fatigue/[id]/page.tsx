import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Tile,
  Breadcrumb,
  BreadcrumbItem,
  Tag,
} from '@carbon/react'
import type { TagType } from '@/components/table/DataTableClient'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shiftTypeTagType(type: string): TagType {
  const map: Record<string, TagType> = {
    standard: 'blue',
    overtime: 'teal',
    on_call: 'gray',
    night: 'purple',
  }
  return map[type] ?? 'gray'
}

function alertSeverityType(severity: string): TagType {
  const map: Record<string, TagType> = {
    info: 'blue',
    warning: 'teal',
    high: 'red',
    critical: 'red',
  }
  return map[severity] ?? 'gray'
}

function alertStatusType(status: string): TagType {
  const map: Record<string, TagType> = {
    open: 'red',
    acknowledged: 'teal',
    resolved: 'green',
  }
  return map[status] ?? 'gray'
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

export default async function ShiftLogDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: log } = await supabase
    .from('shift_logs')
    .select(
      `id, shift_date, shift_start, shift_end, hours_worked, shift_type, notes, created_at,
       user_profiles!worker_id(id, first_name, last_name, job_title),
       sites!site_id(name),
       creator:user_profiles!created_by(first_name, last_name)`
    )
    .eq('id', id)
    .single()

  if (!log) notFound()

  const { data: alerts } = await supabase
    .from('fatigue_alerts')
    .select(
      'id, alert_type, actual_value, threshold_value, severity, status, created_at, acknowledged_at'
    )
    .eq('shift_log_id', id)
    .order('created_at', { ascending: false })

  const workerRaw = log.user_profiles
  const siteRaw = log.sites
  const creatorRaw = log.creator

  const worker = Array.isArray(workerRaw)
    ? (workerRaw[0] as { id: string; first_name: string; last_name: string; job_title: string | null } | undefined) ?? null
    : (workerRaw as { id: string; first_name: string; last_name: string; job_title: string | null } | null)

  const site = Array.isArray(siteRaw)
    ? (siteRaw[0] as { name: string } | undefined) ?? null
    : (siteRaw as { name: string } | null)

  const creator = Array.isArray(creatorRaw)
    ? (creatorRaw[0] as { first_name: string; last_name: string } | undefined) ?? null
    : (creatorRaw as { first_name: string; last_name: string } | null)

  const workerName = worker ? `${worker.first_name} ${worker.last_name}` : '—'
  const shiftType = log.shift_type ?? 'standard'

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/fatigue">Fatigue &amp; Shift Monitoring</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{workerName}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: '0.75rem',
              color: '#6f6f6f',
              letterSpacing: '0.32px',
              marginBottom: '0.25rem',
              textTransform: 'uppercase',
            }}
          >
            Shift Log
          </p>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.5rem',
            }}
          >
            {workerName}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {formatDate(log.shift_date)}
          </p>
        </div>
        <Tag type={shiftTypeTagType(shiftType)} size="md" style={{ marginTop: '0.5rem' }}>
          {shiftType.replace(/_/g, ' ')}
        </Tag>
      </div>

      <Grid condensed>
        {/* Left column — shift details */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Shift Details
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Worker">
                    {worker ? (
                      <a
                        href={`/workers/${worker.id}`}
                        style={{ color: '#0f62fe', textDecoration: 'none' }}
                      >
                        {workerName}
                      </a>
                    ) : (
                      '—'
                    )}
                  </DetailRow>
                </Column>
                {worker?.job_title && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Job Title">{worker.job_title}</DetailRow>
                  </Column>
                )}
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Shift Date">{formatDate(log.shift_date)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Site">{site?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Shift Start">{formatDateTime(log.shift_start)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Shift End">{formatDateTime(log.shift_end ?? null)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Hours Worked">
                    {log.hours_worked != null ? `${Number(log.hours_worked).toFixed(1)} hrs` : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Shift Type">
                    <Tag type={shiftTypeTagType(shiftType)} size="sm">
                      {shiftType.replace(/_/g, ' ')}
                    </Tag>
                  </DetailRow>
                </Column>
              </Grid>
            </div>
          </Tile>

          {log.notes && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Notes
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>
                  {log.notes}
                </p>
              </div>
            </Tile>
          )}

          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Record Info
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Logged At">{formatDateTime(log.created_at)}</DetailRow>
                </Column>
                {creator && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Logged By">
                      {`${creator.first_name} ${creator.last_name}`}
                    </DetailRow>
                  </Column>
                )}
              </Grid>
            </div>
          </Tile>
        </Column>

        {/* Right column — fatigue alerts */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Fatigue Alerts
                {alerts && alerts.length > 0 && (
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '1.25rem',
                      height: '1.25rem',
                      borderRadius: '50%',
                      backgroundColor: '#da1e28',
                      color: '#fff',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                    }}
                  >
                    {alerts.length}
                  </span>
                )}
              </h2>
            </div>
            {!alerts || alerts.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  color: '#6f6f6f',
                  fontSize: '0.875rem',
                }}
              >
                No fatigue alerts for this shift
              </div>
            ) : (
              <div style={{ padding: '1rem 1.5rem' }}>
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '1rem',
                      marginBottom: '0.75rem',
                      border: '1px solid #e0e0e0',
                      borderRadius: '2px',
                      backgroundColor:
                        alert.status === 'open' ? 'rgba(218,30,40,0.04)' : '#f4f4f4',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#161616',
                          textTransform: 'capitalize',
                        }}
                      >
                        {alert.alert_type.replace(/_/g, ' ')}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Tag type={alertSeverityType(alert.severity)} size="sm">
                          {alert.severity}
                        </Tag>
                        <Tag type={alertStatusType(alert.status)} size="sm">
                          {alert.status}
                        </Tag>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#525252' }}>
                      Actual: <strong style={{ color: '#161616' }}>{alert.actual_value}</strong>
                      {' / '}
                      Threshold: <strong style={{ color: '#161616' }}>{alert.threshold_value}</strong>
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>
                      Raised {formatDateTime(alert.created_at)}
                      {alert.acknowledged_at &&
                        ` · Acknowledged ${formatDateTime(alert.acknowledged_at)}`}
                    </p>
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
