import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column, Tile, Tag } from '@carbon/react'
import Link from 'next/link'
import { CertificateButton } from '@/components/training/CertificateButton'

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

export default async function TrainingRecordDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: record } = await supabase
    .from('training_records')
    .select(`
      *,
      user_profiles!worker_id(first_name, last_name, email, job_title),
      training_courses!course_id(name, code, course_type, is_certification)
    `)
    .eq('id', id)
    .single()

  if (!record) notFound()

  // Fetch organisation name for the certificate
  const { data: org } = await supabase
    .from('organisations')
    .select('name')
    .eq('id', record.organisation_id)
    .single()

  const workerRaw = record.user_profiles
  const courseRaw = record.training_courses
  const worker = Array.isArray(workerRaw)
    ? (workerRaw[0] as { first_name: string; last_name: string; email: string; job_title: string | null } | undefined) ?? null
    : (workerRaw as { first_name: string; last_name: string; email: string; job_title: string | null } | null)
  const course = Array.isArray(courseRaw)
    ? (courseRaw[0] as { name: string; code: string | null; course_type: string; is_certification: boolean } | undefined) ?? null
    : (courseRaw as { name: string; code: string | null; course_type: string; is_certification: boolean } | null)

  function statusTag(status: string): 'green' | 'teal' | 'red' {
    if (status === 'expired') return 'red'
    if (status === 'expiring_soon') return 'teal'
    return 'green'
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/training">Training</BreadcrumbItem>
        <BreadcrumbItem href="/training/records">Training Records</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{record.record_number ?? id}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            {record.record_number ?? 'Training Record'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {worker ? `${worker.first_name} ${worker.last_name}` : '—'} — {course?.name ?? '—'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {(record.status === 'current' || record.status === 'expiring_soon') && worker && course && (
            <CertificateButton
              workerName={`${worker.first_name} ${worker.last_name}`}
              courseName={course.name}
              completedDate={formatDate(record.completed_date)}
              expiryDate={record.expiry_date ? formatDate(record.expiry_date) : null}
              recordNumber={record.record_number ?? id}
              orgName={org?.name ?? 'EXXIO'}
            />
          )}
          <Tag type={statusTag(record.status)} size="md">
            {record.status.replace(/_/g, ' ')}
          </Tag>
        </div>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Training Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Course">
                    <Link href={`/training/courses/${record.course_id}`} style={{ color: '#0f62fe', textDecoration: 'none' }}>
                      {course?.name ?? '—'}
                    </Link>
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Course Code">{course?.code ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Completed Date">{formatDate(record.completed_date)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Expiry Date">{formatDate(record.expiry_date)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Delivery Method">{record.delivery_method ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Provider">{record.provider ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Trainer / Assessor">{record.trainer_name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Certificate Number">{record.certificate_number ?? '—'}</DetailRow>
                </Column>
                {course?.is_certification && (
                  <Column sm={4} md={8} lg={16}>
                    <DetailRow label="Certification">
                      <Tag type="teal" size="sm">Certification Awarded</Tag>
                    </DetailRow>
                  </Column>
                )}
              </Grid>
              {record.notes && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.5rem' }}>Notes</p>
                  <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.5 }}>{record.notes}</p>
                </div>
              )}
            </div>
          </Tile>
        </Column>

        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Worker</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {worker ? (
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <DetailRow label="Name">
                      <Link href={`/workers/${record.worker_id}`} style={{ color: '#0f62fe', textDecoration: 'none' }}>
                        {worker.first_name} {worker.last_name}
                      </Link>
                    </DetailRow>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Email">{worker.email}</DetailRow>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Job Title">{worker.job_title ?? '—'}</DetailRow>
                  </Column>
                </Grid>
              ) : (
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>Worker not found</p>
              )}
            </div>
          </Tile>

          {record.certificate_file_url && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Certificate</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <a
                  href={record.certificate_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
                >
                  {record.certificate_file_name ?? 'Download Certificate'}
                </a>
              </div>
            </Tile>
          )}
        </Column>
      </Grid>
    </div>
  )
}
