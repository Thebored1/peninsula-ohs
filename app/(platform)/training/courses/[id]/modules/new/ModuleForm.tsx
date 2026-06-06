'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, InlineNotification, Toggle, NumberInput,
} from '@carbon/react'
import { addCourseModule } from '@/app/actions/training'

interface Props {
  courseId: string
  courseName: string
}

export function ModuleForm({ courseId, courseName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await addCourseModule(formData)
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
        <input type="hidden" name="course_id" value={courseId} />
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Module Details — {courseName}
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="title"
                      name="title"
                      labelText="Module Title *"
                      required
                    />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea
                      id="description"
                      name="description"
                      labelText="Description"
                      rows={3}
                    />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select id="content_type" name="content_type" labelText="Content Type" defaultValue="">
                      <SelectItem value="" text="Select type…" />
                      <SelectItem value="reading" text="Reading" />
                      <SelectItem value="document" text="Document" />
                      <SelectItem value="video" text="Video" />
                      <SelectItem value="quiz" text="Quiz" />
                      <SelectItem value="checklist" text="Checklist" />
                      <SelectItem value="external_url" text="External URL" />
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="content_url"
                      name="content_url"
                      labelText="Content URL or File Link"
                      helperText="Optional link to module content"
                    />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <NumberInput
                      id="duration_minutes"
                      name="duration_minutes"
                      label="Duration (minutes)"
                      min={0}
                      step={5}
                      allowEmpty
                    />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'flex-end' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem' }}>Mandatory</p>
                      <Toggle
                        id="is_mandatory"
                        name="is_mandatory"
                        labelText=""
                        labelA="Optional"
                        labelB="Mandatory"
                        defaultToggled={true}
                        value="true"
                        onToggle={(checked: boolean) => {
                          const input = document.getElementById('is_mandatory') as HTMLInputElement | null
                          if (input) input.value = checked ? 'true' : 'false'
                        }}
                      />
                    </div>
                  </Column>
                </Grid>
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Add Module'}
              </Button>
              <Button kind="ghost" href={`/training/courses/${courseId}`}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
