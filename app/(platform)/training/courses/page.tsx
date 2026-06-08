import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { getOrgProvince } from '@/lib/supabase/get-org-province'
import { Tile, Tag } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import { NewButton } from '@/components/ui/NewButton'

const PROVINCE_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  SK: 'Saskatchewan', MB: 'Manitoba', NS: 'Nova Scotia', NB: 'New Brunswick',
  PE: 'Prince Edward Island', NL: 'Newfoundland & Labrador',
  YT: 'Yukon', NT: 'Northwest Territories', NU: 'Nunavut',
}

function isApplicable(provinces: string[] | null, orgProvince: string | null): boolean {
  if (!orgProvince) return true
  if (!provinces || provinces.length === 0) return true
  return provinces.includes(orgProvince)
}

export default async function CoursesPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [province, { data: orgCourses }, { data: systemCourses }] = await Promise.all([
    getOrgProvince(),
    supabase
      .from('training_courses')
      .select('id, code, name, course_type, duration_hours, validity_period_months, is_certification, is_active, applicable_provinces')
      .eq('organisation_id', orgId)
      .order('name', { ascending: true }),
    supabase
      .from('training_courses')
      .select('id, code, name, course_type, duration_hours, validity_period_months, is_certification, is_active, applicable_provinces')
      .is('organisation_id', null)
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  const filteredSystem = (systemCourses ?? []).filter((c) =>
    isApplicable(c.applicable_provinces, province)
  )

  const allCourses = [
    ...filteredSystem.map((c) => ({ ...c, _source: 'System' as const })),
    ...(orgCourses ?? []).map((c) => ({ ...c, _source: 'Custom' as const })),
  ]

  const rows = allCourses.map((c) => ({
    id: c.id,
    source: c._source,
    code: c.code ?? '—',
    name: c.name,
    course_type: c.course_type,
    duration_hours: c.duration_hours != null ? `${c.duration_hours}h` : '—',
    validity: c.validity_period_months != null ? `${c.validity_period_months} months` : 'No expiry',
    is_certification: c.is_certification,
    is_active: c.is_active,
  }))

  const columns: ColDef[] = [
    { key: 'source', header: 'Source', cellConfig: { as: 'tag', map: { System: 'blue', Custom: 'gray' } } },
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Course Name' },
    { key: 'course_type', header: 'Type', cellConfig: { as: 'tag', map: { classroom: 'blue', e_learning: 'teal', on_the_job: 'cyan', blended: 'purple', assessment: 'gray' }, transform: true } },
    { key: 'duration_hours', header: 'Duration (hrs)' },
    { key: 'validity', header: 'Validity' },
    { key: 'is_certification', header: 'Certification', cellConfig: { as: 'bool_tag', trueType: 'purple', trueLabel: 'Certification', falseType: 'gray', falseLabel: 'No' } },
    { key: 'is_active', header: 'Active', cellConfig: { as: 'bool_tag', trueType: 'green', trueLabel: 'Active', falseType: 'gray', falseLabel: 'Inactive' } },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/training/courses/' } },
  ]

  const provinceName = province ? (PROVINCE_NAMES[province] ?? province) : null

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Course Library</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {filteredSystem.length} system course{filteredSystem.length !== 1 ? 's' : ''}
            {' · '}
            {(orgCourses ?? []).length} custom course{(orgCourses ?? []).length !== 1 ? 's' : ''}
            {provinceName ? (
              <span style={{ marginLeft: '0.5rem' }}>
                · Showing content for{' '}
                <strong>{provinceName} ({province})</strong>
              </span>
            ) : (
              <span style={{ marginLeft: '0.5rem', color: '#a8a8a8' }}>
                · No province set — showing all system courses
              </span>
            )}
          </p>
        </div>
        <NewButton href="/training/courses/new" label="New Course" />
      </div>

      {!province && (
        <Tile
          style={{
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            backgroundColor: '#fff8e1',
            border: '1px solid #f1c21b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: '#725a00' }}>
            Your organisation does not have a province set. Set it in{' '}
            <a href="/settings/organisation" style={{ color: '#0f62fe' }}>Organisation Settings</a>
            {' '}to see only province-relevant compliance courses.
          </span>
        </Tile>
      )}

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No courses available
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

      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '1rem' }}>
        <Tag type="blue" size="sm">System</Tag>{' '}courses are pre-built compliance templates.{' '}
        <Tag type="gray" size="sm">Custom</Tag>{' '}courses are created by your organisation.
      </p>
    </div>
  )
}
