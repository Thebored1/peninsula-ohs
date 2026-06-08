'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, Toggle, InlineNotification,
} from '@carbon/react'
import { updateCourse } from '@/app/actions/training'

const PROVINCES = [
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'NL', name: 'Newfoundland & Labrador' },
  { code: 'YT', name: 'Yukon' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
]

interface Course {
  id: string
  code: string | null
  name: string
  description: string | null
  course_type: string
  duration_hours: number | null
  validity_period_months: number | null
  is_certification: boolean
  is_active: boolean
  applicable_provinces: string[] | null
}

interface Props { course: Course }

const COURSE_TYPES = [
  { value: 'classroom', label: 'Classroom' },
  { value: 'e_learning', label: 'E-Learning' },
  { value: 'on_the_job', label: 'On the Job' },
  { value: 'blended', label: 'Blended' },
  { value: 'assessment', label: 'Assessment' },
]

export function CourseEditForm({ course }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isCertification, setIsCertification] = useState(course.is_certification)
  const [isActive, setIsActive] = useState(course.is_active)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('is_certification', isCertification ? 'true' : 'false')
    formData.set('is_active', isActive ? 'true' : 'false')
    startTransition(async () => {
      const result = await updateCourse(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
          style={{ marginBottom: '1.5rem', maxWidth: '100%' }}
        />
      )}
      <Form onSubmit={handleSubmit}>
        <input type="hidden" name="id" value={course.id} />
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Course Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput id="name" name="name" labelText="Course Name *" defaultValue={course.name} required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="code" name="code" labelText="Course Code" defaultValue={course.code ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select id="course_type" name="course_type" labelText="Delivery Type *" defaultValue={course.course_type}>
                      {COURSE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} text={t.label} />
                      ))}
                    </Select>
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="description" name="description" labelText="Description" rows={3} defaultValue={course.description ?? ''} />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Duration, Validity &amp; Status</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="duration_hours"
                      name="duration_hours"
                      labelText="Duration (hours)"
                      type="number"
                      min="0"
                      step="0.5"
                      defaultValue={course.duration_hours != null ? String(course.duration_hours) : ''}
                    />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="validity_period_months"
                      name="validity_period_months"
                      labelText="Validity Period (months)"
                      type="number"
                      min="0"
                      helperText="Leave blank if no expiry"
                      defaultValue={course.validity_period_months != null ? String(course.validity_period_months) : ''}
                    />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Toggle
                      id="is_certification"
                      labelText="This course awards a certification"
                      labelA="No"
                      labelB="Yes"
                      toggled={isCertification}
                      onToggle={(checked: boolean) => setIsCertification(checked)}
                    />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Toggle
                      id="is_active"
                      labelText="Course Status"
                      labelA="Inactive"
                      labelB="Active"
                      toggled={isActive}
                      onToggle={(checked: boolean) => setIsActive(checked)}
                    />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Province / Jurisdiction</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f', marginBottom: '1rem' }}>
                  Select which Canadian provinces this applies to. Leave blank to apply to all.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {PROVINCES.map((p) => (
                    <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', color: '#161616' }}>
                      <input
                        type="checkbox"
                        name="applicable_provinces"
                        value={p.code}
                        defaultChecked={(course.applicable_provinces ?? []).includes(p.code)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span><strong>{p.code}</strong> — {p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button kind="ghost" href={`/training/courses/${course.id}`}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
