'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, Toggle, InlineNotification,
} from '@carbon/react'
import { createCourse } from '@/app/actions/training'

const COURSE_TYPES = [
  { value: 'classroom', label: 'Classroom' },
  { value: 'e_learning', label: 'E-Learning' },
  { value: 'on_the_job', label: 'On the Job' },
  { value: 'blended', label: 'Blended' },
  { value: 'assessment', label: 'Assessment' },
]

export function CourseForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isCertification, setIsCertification] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('is_certification', isCertification ? 'true' : 'false')
    startTransition(async () => {
      const result = await createCourse(formData)
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
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Course Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput id="name" name="name" labelText="Course Name *" required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="code" name="code" labelText="Course Code" />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select id="course_type" name="course_type" labelText="Delivery Type *" defaultValue="classroom">
                      {COURSE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} text={t.label} />
                      ))}
                    </Select>
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="description" name="description" labelText="Description" rows={3} />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Duration &amp; Validity</h2>
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
                    />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <Toggle
                      id="is_certification"
                      labelText="This course awards a certification"
                      labelA="No"
                      labelB="Yes"
                      toggled={isCertification}
                      onToggle={(checked: boolean) => setIsCertification(checked)}
                    />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Course'}
              </Button>
              <Button kind="ghost" href="/training/courses">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
