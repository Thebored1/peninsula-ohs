import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

export default async function CoursesPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data } = await supabase
    .from('training_courses')
    .select('id, code, name, course_type, duration_hours, validity_period_months, is_certification, is_active')
    .eq('organisation_id', orgId)
    .order('name', { ascending: true })

  const rows = (data ?? []).map((c) => ({
    id: c.id,
    code: c.code ?? '—',
    name: c.name,
    course_type: c.course_type,
    duration_hours: c.duration_hours != null ? `${c.duration_hours}h` : '—',
    validity: c.validity_period_months != null ? `${c.validity_period_months} months` : 'No expiry',
    is_certification: c.is_certification,
    is_active: c.is_active,
  }))

  const columns: ColDef[] = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Course Name' },
    { key: 'course_type', header: 'Type', cellConfig: { as: 'tag', map: { classroom: 'blue', e_learning: 'teal', on_the_job: 'cyan', blended: 'purple', assessment: 'gray' }, transform: true } },
    { key: 'duration_hours', header: 'Duration (hrs)' },
    { key: 'validity', header: 'Validity' },
    { key: 'is_certification', header: 'Certification', cellConfig: { as: 'bool_tag', trueType: 'purple', trueLabel: 'Certification', falseType: 'gray', falseLabel: 'No' } },
    { key: 'is_active', header: 'Active', cellConfig: { as: 'bool_tag', trueType: 'green', trueLabel: 'Active', falseType: 'gray', falseLabel: 'Inactive' } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/training/courses/' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Course Library</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} course{rows.length !== 1 ? 's' : ''} defined
          </p>
        </div>
        <NewButton href="/training/courses/new" label="New Course" />
      </div>

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No courses defined yet
          </div>
        ) : (
          <DataTableClient
            id="courses-table"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search courses…"
          />
        )}
      </Tile>
    </div>
  )
}
