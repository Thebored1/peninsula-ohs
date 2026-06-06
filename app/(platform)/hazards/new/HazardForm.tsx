'use client'

import { useState, useTransition } from 'react'
import {
  Grid,
  Column,
  Tile,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  Button,
  Form,
  FormGroup,
  InlineNotification,
  Breadcrumb,
  BreadcrumbItem,
  Toggle,
  DatePicker,
  DatePickerInput,
} from '@carbon/react'
import { createClient } from '@/lib/supabase/client'
import { createHazardReport } from '@/app/actions/hazards'

interface Worker {
  id: string
  first_name: string
  last_name: string
}

interface HazardFormProps {
  workers?: Worker[]
}

export default function HazardForm({ workers = [] }: HazardFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [immediateRisk, setImmediateRisk] = useState(false)
  const [observedById, setObservedById] = useState<string>('__other__')
  const [observedByFreeText, setObservedByFreeText] = useState('')
  const [observedDate, setObservedDate] = useState<string>('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const formData = new FormData(form)

    // Override immediate_risk_to_people from React state (Toggle doesn't wire to FormData)
    formData.set('immediate_risk_to_people', immediateRisk ? 'true' : 'false')

    // Set observed_date from React state (DatePicker doesn't wire to FormData via name)
    if (observedDate) formData.set('observed_date', observedDate)

    // Handle observed_by: prefer the select value; fall back to free-text
    if (observedById && observedById !== '__other__') {
      formData.set('observed_by', observedById)
      formData.delete('observed_by_name')
    } else {
      formData.delete('observed_by')
      formData.set('observed_by_name', observedByFreeText.trim())
    }

    // File upload to Supabase Storage
    const fileInput = form.querySelector('input[data-upload="true"]') as HTMLInputElement
    const file = fileInput?.files?.[0]
    if (file) {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'bin'
      const uploadPath = crypto.randomUUID() + '.' + ext
      const { data: upload } = await supabase.storage
        .from('hazard-evidence')
        .upload(uploadPath, file, { upsert: true })
      if (upload) {
        const { data: urlData } = supabase.storage
          .from('hazard-evidence')
          .getPublicUrl(upload.path)
        formData.set('evidence_file_url', urlData.publicUrl)
        formData.set('evidence_file_name', file.name)
      }
    }

    startTransition(async () => {
      const result = await createHazardReport(formData)
      if (result?.error) {
        setError(result.error)
      }
      // On success the server action redirects — no client-side nav needed
    })
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/hazards">Hazard Reports</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Report a Hazard</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>
              Report a Hazard
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.25rem' }}>
              Use this form to report a safety hazard in the workplace.
            </p>
          </div>
        </Column>
      </Grid>

      <Grid>
        <Column sm={4} md={8} lg={12}>
          {error && (
            <div style={{ marginBottom: '1.5rem' }}>
              <InlineNotification
                kind="error"
                title="Submission error"
                subtitle={error}
                hideCloseButton
              />
            </div>
          )}

          <Form onSubmit={handleSubmit}>
            {/* ── Section 1: Hazard Details ── */}
            <Tile style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
                Hazard Details
              </h2>
              <FormGroup legendText="">
                <div style={{ marginBottom: '1.5rem' }}>
                  <TextInput
                    id="title"
                    name="title"
                    labelText="Title"
                    placeholder="Brief description of the hazard"
                    required
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <TextArea
                    id="description"
                    name="description"
                    labelText="Describe the hazard"
                    placeholder="Provide a detailed description of the hazard, what happened, and any relevant context…"
                    rows={4}
                    required
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <TextInput
                    id="location_details"
                    name="location_details"
                    labelText="Location / Work Area"
                    placeholder="e.g. Warehouse B, Loading Dock 3"
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <Select
                    id="severity_perception"
                    name="severity_perception"
                    labelText="Severity (your perception)"
                    defaultValue="medium"
                  >
                    <SelectItem value="low" text="Low" />
                    <SelectItem value="medium" text="Medium" />
                    <SelectItem value="high" text="High" />
                    <SelectItem value="critical" text="Critical" />
                  </Select>
                </div>
              </FormGroup>
            </Tile>

            {/* ── Section 2: Observation Details ── */}
            <Tile style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
                Observation Details
              </h2>
              <FormGroup legendText="">
                <div style={{ marginBottom: '1.5rem' }}>
                  <Select
                    id="hazard_category"
                    name="hazard_category"
                    labelText="Hazard Category"
                    defaultValue=""
                  >
                    <SelectItem value="" text="— Select a category —" />
                    <SelectItem value="physical" text="Physical" />
                    <SelectItem value="chemical" text="Chemical" />
                    <SelectItem value="electrical" text="Electrical" />
                    <SelectItem value="biological" text="Biological" />
                    <SelectItem value="ergonomic" text="Ergonomic" />
                    <SelectItem value="psychosocial" text="Psychosocial" />
                    <SelectItem value="fire" text="Fire" />
                    <SelectItem value="environmental" text="Environmental" />
                    <SelectItem value="other" text="Other" />
                  </Select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <DatePicker
                    datePickerType="single"
                    dateFormat="Y-m-d"
                    onChange={(dates: Date[]) => {
                      const d = dates[0]
                      if (d) {
                        const yyyy = d.getFullYear()
                        const mm = String(d.getMonth() + 1).padStart(2, '0')
                        const dd = String(d.getDate()).padStart(2, '0')
                        setObservedDate(`${yyyy}-${mm}-${dd}`)
                      } else {
                        setObservedDate('')
                      }
                    }}
                  >
                    <DatePickerInput
                      id="observed_date"
                      labelText="Date Observed"
                      placeholder="YYYY-MM-DD"
                    />
                  </DatePicker>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <Toggle
                    id="immediate_risk_to_people"
                    labelText="Immediate risk to people?"
                    labelA="No"
                    labelB="Yes"
                    toggled={immediateRisk}
                    onToggle={(checked: boolean) => setImmediateRisk(checked)}
                  />
                </div>
              </FormGroup>
            </Tile>

            {/* ── Section 3: Reporter ── */}
            <Tile style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
                Observed By
              </h2>
              <FormGroup legendText="">
                {workers.length > 0 ? (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <Select
                      id="observed_by_select"
                      labelText="Select worker (optional)"
                      value={observedById}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setObservedById(e.target.value)
                      }
                    >
                      <SelectItem value="__other__" text="— Other / type name —" />
                      {workers.map((w) => (
                        <SelectItem
                          key={w.id}
                          value={w.id}
                          text={`${w.first_name} ${w.last_name}`}
                        />
                      ))}
                    </Select>
                  </div>
                ) : null}

                {(workers.length === 0 || observedById === '__other__') && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <TextInput
                      id="observed_by_name"
                      labelText="Observer name (free text)"
                      placeholder="Full name of the person who observed the hazard"
                      value={observedByFreeText}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setObservedByFreeText(e.target.value)
                      }
                    />
                  </div>
                )}
              </FormGroup>
            </Tile>

            {/* ── Section 4: Recommendations ── */}
            <Tile style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
                Recommendations
              </h2>
              <FormGroup legendText="">
                <div style={{ marginBottom: '1.5rem' }}>
                  <TextArea
                    id="suggested_control"
                    name="suggested_control"
                    labelText="Suggested Control Measure"
                    placeholder="Describe any actions that could reduce or eliminate this hazard…"
                    rows={3}
                  />
                </div>
              </FormGroup>
            </Tile>

            {/* ── Section 5: Evidence ── */}
            <Tile style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
                Evidence
              </h2>
              <FormGroup legendText="">
                <div style={{ marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.5rem' }}>
                    Attach Photo / Video Evidence
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.75rem' }}>
                    Accepted formats: JPG, PNG, PDF, MP4 (max 50 MB)
                  </p>
                  <input
                    type="file"
                    data-upload="true"
                    accept=".jpg,.jpeg,.png,.pdf,.mp4"
                    style={{
                      fontSize: '0.875rem',
                      color: '#161616',
                      border: '1px solid #e0e0e0',
                      padding: '0.5rem 0.75rem',
                      width: '100%',
                      background: '#f4f4f4',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </FormGroup>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Button
                type="submit"
                kind="primary"
                size="md"
                disabled={isPending}
              >
                {isPending ? 'Submitting…' : 'Submit Report'}
              </Button>
              <Button
                kind="ghost"
                href="/hazards"
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Column>
      </Grid>
    </div>
  )
}
