import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import Link from 'next/link'
import { NewButton } from '@/components/ui/NewButton'

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
  ])

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
