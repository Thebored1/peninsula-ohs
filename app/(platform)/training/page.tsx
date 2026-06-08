import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import Link from 'next/link'
import { NewButton } from '@/components/ui/NewButton'

const PROVINCE_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  SK: 'Saskatchewan', MB: 'Manitoba', NS: 'Nova Scotia', NB: 'New Brunswick',
  PE: 'Prince Edward Island', NL: 'Newfoundland & Labrador',
  YT: 'Yukon', NT: 'Northwest Territories', NU: 'Nunavut',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusColour(status: string) {
  if (status === 'expired') return '#da1e28'
  if (status === 'expiring_soon') return '#f1c21b'
  return '#24a148'
}

function statusLabel(status: string) {
  if (status === 'expired') return 'Expired'
  if (status === 'expiring_soon') return 'Expiring Soon'
  return 'Current'
}

export default async function TrainingPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  // Cutoff for "expiring soon" — 60 days from today
  const sixtyDaysFromNow = new Date()
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)
  const today = new Date().toISOString().split('T')[0]
  const cutoff = sixtyDaysFromNow.toISOString().split('T')[0]

  const [
    { count: totalRecords },
    { count: currentCount },
    { count: expiringSoonCount },
    { count: expiredCount },
    { count: inductionCount },
    { data: expiringSoonRecords },
    { data: orgRow },
    { count: workerCount },
    { data: allSystemCourses },
  ] = await Promise.all([
    supabase
      .from('training_records')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', orgId),
    supabase
      .from('training_records')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', orgId)
      .eq('status', 'current'),
    supabase
      .from('training_records')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', orgId)
      .gte('expiry_date', today)
      .lte('expiry_date', cutoff),
    supabase
      .from('training_records')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', orgId)
      .eq('status', 'expired'),
    supabase
      .from('induction_completions')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', orgId),
    supabase
      .from('training_records')
      .select('id, record_number, expiry_date, status, user_profiles!worker_id(first_name, last_name), training_courses!course_id(name)')
      .eq('organisation_id', orgId)
      .gte('expiry_date', today)
      .lte('expiry_date', cutoff)
      .order('expiry_date', { ascending: true })
      .limit(10),
    supabase.from('organisations').select('province').eq('id', orgId).single(),
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', orgId),
    supabase
      .from('training_courses')
      .select('id, name, is_certification, applicable_provinces')
      .is('organisation_id', null)
      .eq('is_active', true)
      .order('name'),
  ])

  const province = orgRow?.province ?? null
  const provinceName = province ? (PROVINCE_NAMES[province] ?? province) : null

  // Filter system courses to those applicable to the org's province
  const complianceCourses = (allSystemCourses ?? []).filter((c) => {
    if (!province) return !c.applicable_provinces || c.applicable_provinces.length === 0
    if (!c.applicable_provinces || c.applicable_provinces.length === 0) return true
    return c.applicable_provinces.includes(province)
  })

  // Count distinct workers with current/expiring_soon records per course
  let completionCounts: Record<string, number> = {}
  if (complianceCourses.length > 0) {
    const courseIds = complianceCourses.map((c) => c.id)
    const { data: completionRows } = await supabase
      .from('training_records')
      .select('course_id, worker_id')
      .eq('organisation_id', orgId)
      .in('course_id', courseIds)
      .in('status', ['current', 'expiring_soon'])
    const workersByCourse: Record<string, Set<string>> = {}
    for (const r of completionRows ?? []) {
      if (!workersByCourse[r.course_id]) workersByCourse[r.course_id] = new Set()
      workersByCourse[r.course_id].add(r.worker_id)
    }
    completionCounts = Object.fromEntries(
      Object.entries(workersByCourse).map(([k, v]) => [k, v.size])
    )
  }

  const totalWorkers = workerCount ?? 0

  const stats = [
    { label: 'Total Records', value: totalRecords ?? 0, href: '/training/records', colour: '#0f62fe', bg: '#edf5ff' },
    { label: 'Current', value: currentCount ?? 0, href: '/training/records', colour: '#24a148', bg: '#defbe6' },
    { label: 'Expiring ≤60 days', value: expiringSoonCount ?? 0, href: '/training/records', colour: '#b08800', bg: '#fdf6dd' },
    { label: 'Expired', value: expiredCount ?? 0, href: '/training/records', colour: '#da1e28', bg: '#fff1f1' },
  ]

  const sections = [
    { title: 'Course Library', desc: 'Define training courses and certification programs', href: '/training/courses', action: 'New Course', actionHref: '/training/courses/new' },
    { title: 'Training Records', desc: 'Log and track worker training completions', href: '/training/records', action: 'Log Training', actionHref: '/training/records/new' },
    { title: 'Certifications Register', desc: 'View all certification-type training records', href: '/training/records', action: 'Log Training', actionHref: '/training/records/new' },
    { title: 'Needs Matrix', desc: 'View training requirements across roles and sites', href: '/training/records', action: 'View Records', actionHref: '/training/records' },
    { title: 'Inductions', desc: `${inductionCount ?? 0} induction completion${(inductionCount ?? 0) !== 1 ? 's' : ''} recorded`, href: '/training/inductions', action: 'New Program', actionHref: '/training/inductions/new' },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Training &amp; Competency
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            Manage training courses, records, and induction programs
          </p>
        </div>
        <NewButton href="/training/records/new" label="Log Training" />
      </div>

      {/* 4 Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
            <Tile style={{ padding: '1.25rem', cursor: 'pointer', backgroundColor: s.bg, border: `1px solid ${s.colour}20` }}>
              <p style={{ fontSize: '2rem', fontWeight: 300, color: s.colour, marginBottom: '0.25rem', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.375rem' }}>{s.label}</p>
            </Tile>
          </Link>
        ))}
      </div>

      {/* Expiring soon list */}
      {expiringSoonRecords && expiringSoonRecords.length > 0 && (
        <Tile style={{ padding: 0, marginBottom: '2rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
              Expiring Within 60 Days
            </h2>
            <Link href="/training/records" style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>View all records</Link>
          </div>
          <div>
            {expiringSoonRecords.map((r, i) => {
              const workerRaw = r.user_profiles
              const courseRaw = r.training_courses
              const worker = Array.isArray(workerRaw)
                ? (workerRaw[0] as { first_name: string; last_name: string } | undefined) ?? null
                : (workerRaw as { first_name: string; last_name: string } | null)
              const course = Array.isArray(courseRaw)
                ? (courseRaw[0] as { name: string } | undefined) ?? null
                : (courseRaw as { name: string } | null)
              return (
                <Link
                  key={r.id}
                  href={`/training/records/${r.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.875rem 1.5rem',
                    borderBottom: i < expiringSoonRecords.length - 1 ? '1px solid #f4f4f4' : 'none',
                    textDecoration: 'none',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.125rem' }}>
                      {worker ? `${worker.first_name} ${worker.last_name}` : '—'}
                      {' — '}
                      {course?.name ?? '—'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                      {r.record_number ?? '—'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', color: statusColour(r.status), fontWeight: 600 }}>
                      {statusLabel(r.status)}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                      Expires {formatDate(r.expiry_date)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </Tile>
      )}

      {/* Province compliance panel */}
      {complianceCourses.length > 0 && (
        <Tile style={{ padding: 0, marginBottom: '2rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.125rem' }}>
                Jurisdiction Compliance
                {provinceName && (
                  <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: '#525252' }}>
                    — {provinceName} ({province})
                  </span>
                )}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                Required system courses · {totalWorkers} worker{totalWorkers !== 1 ? 's' : ''} in your organisation
              </p>
            </div>
            {!province && (
              <a href="/settings/organisation" style={{ fontSize: '0.75rem', color: '#0f62fe', textDecoration: 'none' }}>
                Set province
              </a>
            )}
          </div>
          <div>
            {complianceCourses.map((course, i) => {
              const trained = completionCounts[course.id] ?? 0
              const pct = totalWorkers > 0 ? Math.round((trained / totalWorkers) * 100) : 0
              const isFullCoverage = totalWorkers > 0 && trained >= totalWorkers
              const barColour = isFullCoverage ? '#24a148' : pct >= 50 ? '#f1c21b' : '#da1e28'
              return (
                <Link
                  key={course.id}
                  href={`/training/courses/${course.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    padding: '0.875rem 1.5rem',
                    borderBottom: i < complianceCourses.length - 1 ? '1px solid #f4f4f4' : 'none',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.375rem' }}>
                      {course.name}
                      {course.is_certification && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.6875rem', background: '#e8e8ff', color: '#393999', padding: '0.125rem 0.375rem', borderRadius: '2px' }}>
                          Certification
                        </span>
                      )}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ flex: 1, background: '#e0e0e0', height: '4px', borderRadius: '2px', maxWidth: '200px' }}>
                        <div style={{ background: barColour, height: '4px', borderRadius: '2px', width: `${pct}%`, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#525252', flexShrink: 0 }}>
                        {trained}/{totalWorkers} workers
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {isFullCoverage ? (
                      <span style={{ fontSize: '0.75rem', color: '#24a148', fontWeight: 600 }}>✓ Full coverage</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: totalWorkers > 0 ? '#da1e28' : '#6f6f6f', fontWeight: 600 }}>
                        {totalWorkers > 0 ? `${totalWorkers - trained} gap${totalWorkers - trained !== 1 ? 's' : ''}` : 'No workers'}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </Tile>
      )}

      {/* Sub-section tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {sections.map((card) => (
          <Tile key={card.title} style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>{card.title}</h2>
              <Link href={card.actionHref} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
                {card.action}
              </Link>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1rem' }}>{card.desc}</p>
              <Link href={card.href} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
                View all &rarr;
              </Link>
            </div>
          </Tile>
        ))}
      </div>
    </div>
  )
}
