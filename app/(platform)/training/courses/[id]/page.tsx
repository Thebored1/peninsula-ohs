import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column, Tile, Tag } from '@carbon/react'
import Link from 'next/link'

interface PageProps { params: Promise<{ id: string }> }

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

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TYPE_LABELS: Record<string, string> = {
  classroom: 'Classroom',
  e_learning: 'E-Learning',
  on_the_job: 'On the Job',
  blended: 'Blended',
  assessment: 'Assessment',
}

const TYPE_COLOURS: Record<string, 'blue' | 'teal' | 'cyan' | 'purple' | 'gray'> = {
  classroom: 'blue',
  e_learning: 'teal',
  on_the_job: 'cyan',
  blended: 'purple',
  assessment: 'gray',
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('training_courses')
    .select('*')
    .eq('id', id)
    .single()

  if (!course) notFound()

  const { data: records } = await supabase
    .from('training_records')
    .select('id, record_number, completed_date, expiry_date, status, user_profiles!worker_id(first_name, last_name)')
    .eq('course_id', id)
    .order('completed_date', { ascending: false })
    .limit(20)

  const { count: needsCount } = await supabase
    .from('training_needs_matrix')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', id)

  function statusColour(status: string): 'green' | 'teal' | 'red' {
    if (status === 'expired') return 'red'
    if (status === 'expiring_soon') return 'teal'
    return 'green'
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/training">Training</BreadcrumbItem>
        <BreadcrumbItem href="/training/courses">Course Library</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{course.name}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            {course.name}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>{course.code ?? ''}</p>
        </div>
        <Link href={`/training/courses/${id}/edit`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none', marginTop: '0.5rem' }}>
          Edit
        </Link>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Course Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Type">
                    <Tag type={TYPE_COLOURS[course.course_type] ?? 'gray'} size="sm">
                      {TYPE_LABELS[course.course_type] ?? course.course_type}
                    </Tag>
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Status">
                    <Tag type={course.is_active ? 'green' : 'gray'} size="sm">
                      {course.is_active ? 'Active' : 'Inactive'}
                    </Tag>
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Duration">
                    {course.duration_hours != null ? `${course.duration_hours} hours` : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Validity Period">
                    {course.validity_period_months != null ? `${course.validity_period_months} months` : 'No expiry'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Certification">
                    {course.is_certification ? 'Yes' : 'No'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Training Needs">
                    {needsCount ?? 0} role{needsCount !== 1 ? 's' : ''} require this
                  </DetailRow>
                </Column>
              </Grid>
              {course.description && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.5rem' }}>Description</p>
                  <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.5 }}>{course.description}</p>
                </div>
              )}
            </div>
          </Tile>
        </Column>

        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Training Records</h2>
              <Link href="/training/records/new" style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
                Log Training
              </Link>
            </div>
            {!records || records.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.875rem', color: '#6f6f6f' }}>
                No training records for this course
              </div>
            ) : (
              <div>
                {records.map((r, i) => {
                  const workerRaw = r.user_profiles
                  const worker = Array.isArray(workerRaw)
                    ? (workerRaw[0] as { first_name: string; last_name: string } | undefined) ?? null
                    : (workerRaw as { first_name: string; last_name: string } | null)
                  return (
                    <Link
                      key={r.id}
                      href={`/training/records/${r.id}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.875rem 1.5rem',
                        borderBottom: i < records.length - 1 ? '1px solid #f4f4f4' : 'none',
                        textDecoration: 'none',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.125rem' }}>
                          {worker ? `${worker.first_name} ${worker.last_name}` : '—'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                          {formatDate(r.completed_date)}
                          {r.expiry_date ? ` · Expires ${formatDate(r.expiry_date)}` : ''}
                        </p>
                      </div>
                      <Tag type={statusColour(r.status)} size="sm">
                        {r.status.replace(/_/g, ' ')}
                      </Tag>
                    </Link>
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
