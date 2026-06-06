'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, InlineNotification,
} from '@carbon/react'
import { createClient } from '@/lib/supabase/client'
import { createTrainingRecord } from '@/app/actions/training'

interface Worker { id: string; first_name: string; last_name: string }
interface Course { id: string; name: string; validity_period_months: number | null }
interface Props { workers: Worker[]; courses: Course[] }

export function TrainingRecordForm({ workers, courses }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [completedDate, setCompletedDate] = useState('')
  const [autoExpiry, setAutoExpiry] = useState('')

  function handleCourseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const courseId = e.target.value
    setSelectedCourseId(courseId)
    if (courseId && completedDate) computeExpiry(courseId, completedDate)
  }

  function handleCompletedDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const date = e.target.value
    setCompletedDate(date)
    if (selectedCourseId && date) computeExpiry(selectedCourseId, date)
  }

  function computeExpiry(courseId: string, date: string) {
    const course = courses.find((c) => c.id === courseId)
    if (course?.validity_period_months && date) {
      const d = new Date(date)
      d.setMonth(d.getMonth() + course.validity_period_months)
      setAutoExpiry(d.toISOString().split('T')[0])
    } else {
      setAutoExpiry('')
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const fileInput = e.currentTarget.querySelector('input[data-upload="true"]') as HTMLInputElement
    const file = fileInput?.files?.[0]
    if (file) {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'bin'
      const uploadPath = crypto.randomUUID() + '.' + ext
      const { data: upload, error: uploadErr } = await supabase.storage.from('certificates').upload(uploadPath, file, { upsert: true })
      if (uploadErr) { setError('File upload failed: ' + uploadErr.message); return }
      const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(upload.path)
      formData.set('certificate_file_url', publicUrl)
      formData.set('certificate_file_name', file.name)
    }

    startTransition(async () => {
      const result = await createTrainingRecord(formData)
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Training Event</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select id="worker_id" name="worker_id" labelText="Worker *" defaultValue="" required>
                      <SelectItem value="" text="Select worker…" />
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id} text={`${w.last_name}, ${w.first_name}`} />
                      ))}
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select
                      id="course_id"
                      name="course_id"
                      labelText="Course *"
                      defaultValue=""
                      required
                      onChange={handleCourseChange}
                    >
                      <SelectItem value="" text="Select course…" />
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id} text={c.name} />
                      ))}
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="completed_date"
                      name="completed_date"
                      labelText="Completed Date *"
                      type="date"
                      required
                      onChange={handleCompletedDateChange}
                    />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="expiry_date"
                      name="expiry_date"
                      labelText="Expiry Date"
                      type="date"
                      value={autoExpiry}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoExpiry(e.target.value)}
                      helperText="Auto-calculated from course validity; override if needed"
                    />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Delivery Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select id="delivery_method" name="delivery_method" labelText="Delivery Method" defaultValue="">
                      <SelectItem value="" text="Select method…" />
                      <SelectItem value="classroom" text="Classroom" />
                      <SelectItem value="e_learning" text="E-Learning" />
                      <SelectItem value="on_the_job" text="On the Job" />
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="provider" name="provider" labelText="Training Provider" />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="trainer_name" name="trainer_name" labelText="Trainer / Assessor Name" />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="certificate_number" name="certificate_number" labelText="Certificate Number" />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="notes" name="notes" labelText="Notes" rows={3} />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Certificate</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f', marginBottom: '1rem' }}>
                  Optionally attach a scanned certificate or completion letter.
                </p>
                <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.5rem' }}>
                  Upload Certificate (PDF, JPG, PNG)
                </p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  data-upload="true"
                  style={{ display: 'block', marginBottom: '1rem' }}
                />
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Record'}
              </Button>
              <Button kind="ghost" href="/training/records">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
