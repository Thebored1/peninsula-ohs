import { createClient } from '@/lib/supabase/server'
import { Tile, Button, Tag, Grid, Column } from '@carbon/react'
import { Add } from '@carbon/icons-react'
import Link from 'next/link'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  if (score == null) return <span style={{ color: '#6f6f6f' }}>—</span>
  const colors: Record<number, { bg: string; color: string }> = {
    1: { bg: 'rgba(218,30,40,0.12)', color: '#da1e28' },
    2: { bg: 'rgba(249,115,22,0.12)', color: '#c95000' },
    3: { bg: 'rgba(241,194,27,0.12)', color: '#b08800' },
    4: { bg: 'rgba(36,161,72,0.12)', color: '#198038' },
    5: { bg: 'rgba(13,99,205,0.12)', color: '#0f62fe' },
  }
  const { bg, color } = colors[score] ?? { bg: '#f4f4f4', color: '#525252' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span
        style={{
          display: 'inline-block',
          padding: '0.125rem 0.5rem',
          borderRadius: '2px',
          backgroundColor: bg,
          color,
          fontSize: '0.75rem',
          fontWeight: 600,
          minWidth: '1.5rem',
          textAlign: 'center',
        }}
      >
        {score}
      </span>
      <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{label}</span>
    </div>
  )
}

const resourceColumns: ColDef[] = [
  { key: 'title', header: 'Title', cellConfig: { as: 'text_link', prefix: '/wellbeing/' } },
  {
    key: 'resource_type',
    header: 'Type',
    cellConfig: {
      as: 'tag',
      map: {
        eap: 'teal',
        helpline: 'blue',
        internal_support: 'cyan',
        article: 'gray',
        policy: 'purple',
        app: 'magenta',
      },
      transform: true,
    },
  },
  { key: 'contact_name', header: 'Contact' },
  { key: 'contact_phone', header: 'Phone' },
  {
    key: 'is_active',
    header: 'Status',
    cellConfig: {
      as: 'bool_tag',
      trueType: 'green',
      trueLabel: 'Active',
      falseType: 'gray',
      falseLabel: 'Inactive',
    },
  },
  { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/wellbeing/' } },
]

export default async function WellbeingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user!.id)
    .single()

  const [{ data: resources }, { data: checkIns }, { data: programs }] = await Promise.all([
    supabase
      .from('wellbeing_resources')
      .select('id, title, resource_type, contact_name, contact_phone, is_active')
      .eq('organisation_id', profile!.organisation_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('wellbeing_check_ins')
      .select('id, check_in_date, mood_score, stress_level, energy_level, workload_rating, support_requested')
      .eq('organisation_id', profile!.organisation_id)
      .order('check_in_date', { ascending: false })
      .limit(90),
    supabase
      .from('wellbeing_programs')
      .select('id, title, program_type, status, start_date, end_date')
      .eq('organisation_id', profile!.organisation_id)
      .order('created_at', { ascending: false }),
  ])

  const resourceRows = (resources ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    resource_type: r.resource_type,
    contact_name: r.contact_name ?? '—',
    contact_phone: r.contact_phone ?? '—',
    is_active: r.is_active,
    view: '',
  }))

  // Aggregate check-ins by mood score bucket
  const checkInData = checkIns ?? []
  const totalCheckIns = checkInData.length
  const moodCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sumMood = 0
  let sumStress = 0
  let sumEnergy = 0
  let sumWorkload = 0
  let countMood = 0
  let countStress = 0
  let countEnergy = 0
  let countWorkload = 0
  let supportRequestedCount = 0

  for (const ci of checkInData) {
    if (ci.mood_score != null) {
      moodCounts[ci.mood_score] = (moodCounts[ci.mood_score] ?? 0) + 1
      sumMood += ci.mood_score
      countMood++
    }
    if (ci.stress_level != null) { sumStress += ci.stress_level; countStress++ }
    if (ci.energy_level != null) { sumEnergy += ci.energy_level; countEnergy++ }
    if (ci.workload_rating != null) { sumWorkload += ci.workload_rating; countWorkload++ }
    if (ci.support_requested) supportRequestedCount++
  }

  const avgMood = countMood > 0 ? (sumMood / countMood).toFixed(1) : null
  const avgStress = countStress > 0 ? (sumStress / countStress).toFixed(1) : null
  const avgEnergy = countEnergy > 0 ? (sumEnergy / countEnergy).toFixed(1) : null
  const avgWorkload = countWorkload > 0 ? (sumWorkload / countWorkload).toFixed(1) : null

  const moodLabels: Record<number, string> = { 1: 'Very Low', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Excellent' }
  const moodColors: Record<number, string> = {
    1: '#da1e28',
    2: '#f1620a',
    3: '#b08800',
    4: '#198038',
    5: '#0f62fe',
  }

  const programColumns: ColDef[] = [
    { key: 'title', header: 'Program' },
    {
      key: 'program_type',
      header: 'Type',
      cellConfig: {
        as: 'tag',
        map: {
          eap: 'teal',
          fitness: 'green',
          mindfulness: 'blue',
          social: 'cyan',
          training: 'purple',
          nutrition: 'magenta',
        },
        transform: true,
      },
    },
    {
      key: 'status',
      header: 'Status',
      cellConfig: {
        as: 'tag',
        map: { active: 'green', completed: 'gray', cancelled: 'red' },
        transform: true,
      },
    },
    { key: 'start_date', header: 'Start Date', cellConfig: { as: 'date' } },
    { key: 'end_date', header: 'End Date', cellConfig: { as: 'date' } },
  ]

  const programRows = (programs ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    program_type: p.program_type ?? '—',
    status: p.status,
    start_date: p.start_date ?? null,
    end_date: p.end_date ?? null,
  }))

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.25rem',
            }}
          >
            Mental Health &amp; Wellbeing
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            Resources, anonymous check-ins, and wellbeing programs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/wellbeing/check-in">
            <Button kind="secondary" size="md">
              Submit Check-In
            </Button>
          </Link>
          <Link href="/wellbeing/new">
            <Button renderIcon={Add} size="md">
              Add Resource
            </Button>
          </Link>
        </div>
      </div>

      {/* Check-in summary stats */}
      {totalCheckIns > 0 && (
        <Grid condensed style={{ marginBottom: '2rem' }}>
          <Column sm={4} md={8} lg={16}>
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#161616',
                marginBottom: '1rem',
              }}
            >
              Wellbeing Overview
              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6f6f6f', marginLeft: '0.5rem' }}>
                (last {totalCheckIns} check-in{totalCheckIns !== 1 ? 's' : ''})
              </span>
            </h2>
          </Column>
          <Column sm={2} md={2} lg={4}>
            <Tile style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.32px' }}>Avg Mood</p>
              <p style={{ fontSize: '2rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>{avgMood ?? '—'}</p>
              <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.25rem' }}>out of 5</p>
            </Tile>
          </Column>
          <Column sm={2} md={2} lg={4}>
            <Tile style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.32px' }}>Avg Stress</p>
              <p style={{ fontSize: '2rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>{avgStress ?? '—'}</p>
              <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.25rem' }}>out of 5</p>
            </Tile>
          </Column>
          <Column sm={2} md={2} lg={4}>
            <Tile style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.32px' }}>Avg Energy</p>
              <p style={{ fontSize: '2rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>{avgEnergy ?? '—'}</p>
              <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.25rem' }}>out of 5</p>
            </Tile>
          </Column>
          <Column sm={2} md={2} lg={4}>
            <Tile style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.32px' }}>Support Requested</p>
              <p style={{ fontSize: '2rem', fontWeight: 300, color: supportRequestedCount > 0 ? '#da1e28' : '#161616', lineHeight: 1 }}>{supportRequestedCount}</p>
              <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.25rem' }}>check-in{supportRequestedCount !== 1 ? 's' : ''}</p>
            </Tile>
          </Column>

          {/* Mood distribution */}
          <Column sm={4} md={8} lg={16}>
            <Tile style={{ padding: '1.5rem', marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
                Mood Score Distribution
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5].map((score) => {
                  const count = moodCounts[score] ?? 0
                  const pct = countMood > 0 ? Math.round((count / countMood) * 100) : 0
                  return (
                    <div key={score} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: '4rem' }}>
                      <div
                        style={{
                          width: '100%',
                          minWidth: '4rem',
                          height: '4px',
                          borderRadius: '2px',
                          backgroundColor: moodColors[score],
                          opacity: count === 0 ? 0.2 : 1,
                        }}
                      />
                      <span style={{ fontSize: '1.25rem', fontWeight: 600, color: moodColors[score] }}>{count}</span>
                      <span style={{ fontSize: '0.75rem', color: '#525252' }}>{moodLabels[score]}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{pct}%</span>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: '4rem', marginLeft: 'auto' }}>
                  <div style={{ width: '100%', minWidth: '4rem', height: '4px', borderRadius: '2px', backgroundColor: '#8d8d8d' }} />
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#161616' }}>{avgWorkload ?? '—'}</span>
                  <span style={{ fontSize: '0.75rem', color: '#525252' }}>Avg Workload</span>
                  <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>out of 5</span>
                </div>
              </div>
            </Tile>
          </Column>
        </Grid>
      )}

      {totalCheckIns === 0 && (
        <Tile
          style={{
            padding: '2rem',
            marginBottom: '2rem',
            borderLeft: '4px solid #0f62fe',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>
              No wellbeing check-ins yet
            </p>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>
              Encourage your team to submit anonymous check-ins to track wellbeing trends.
            </p>
          </div>
          <Link href="/wellbeing/check-in">
            <Button kind="primary" size="sm">
              Submit First Check-In
            </Button>
          </Link>
        </Tile>
      )}

      {/* Wellbeing Resources */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616' }}>
            Wellbeing Resources
            <Tag type="gray" size="sm" style={{ marginLeft: '0.5rem' }}>
              {resourceRows.length}
            </Tag>
          </h2>
          <Link href="/wellbeing/new">
            <Button kind="ghost" renderIcon={Add} size="sm">
              Add Resource
            </Button>
          </Link>
        </div>
        <Tile style={{ padding: 0 }}>
          {resourceRows.length === 0 ? (
            <div
              style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                color: '#6f6f6f',
                fontSize: '0.875rem',
              }}
            >
              No wellbeing resources added yet
            </div>
          ) : (
            <DataTableClient
              id="resources-search"
              rows={resourceRows}
              columns={resourceColumns}
              searchPlaceholder="Search resources…"
            />
          )}
        </Tile>
      </div>

      {/* Wellbeing Programs */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616' }}>
            Wellbeing Programs
            <Tag type="gray" size="sm" style={{ marginLeft: '0.5rem' }}>
              {programRows.length}
            </Tag>
          </h2>
          <Link href="/wellbeing/programs/new">
            <Button kind="ghost" renderIcon={Add} size="sm">
              New Program
            </Button>
          </Link>
        </div>
        <Tile style={{ padding: 0 }}>
          {programRows.length === 0 ? (
            <div
              style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                color: '#6f6f6f',
                fontSize: '0.875rem',
              }}
            >
              No wellbeing programs created yet
            </div>
          ) : (
            <DataTableClient
              id="programs-search"
              rows={programRows}
              columns={programColumns}
              searchPlaceholder="Search programs…"
            />
          )}
        </Tile>
      </div>
    </div>
  )
}
