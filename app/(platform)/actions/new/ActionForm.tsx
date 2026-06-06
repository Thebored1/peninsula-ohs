'use client'

import { useState, useRef } from 'react'
import {
  Grid,
  Column,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  DatePicker,
  DatePickerInput,
  Toggle,
  Button,
  InlineNotification,
  Breadcrumb,
  BreadcrumbItem,
  Tile,
  FormGroup,
} from '@carbon/react'
import { createAction } from '@/app/actions/action-items'

interface User {
  id: string
  first_name: string
  last_name: string
}

interface Props {
  users: User[]
}

export default function ActionForm({ users }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [verificationRequired, setVerificationRequired] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!formRef.current) return

    const fd = new FormData(formRef.current)
    fd.set('verification_required', verificationRequired ? 'true' : 'false')
    if (dueDate) fd.set('due_date', dueDate)

    setSubmitting(true)
    try {
      const result = await createAction(fd)
      if (result?.error) {
        setError(result.error)
      }
      // On success, createAction redirects — no client-side handling needed
    } catch {
      // redirect() throws — treat non-error throws as success
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          {/* Breadcrumb */}
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/actions">Actions</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Action</BreadcrumbItem>
          </Breadcrumb>

          {/* Page header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Create Action Item</h1>
            <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.25rem' }}>
              Assign a task or corrective action to a team member.
            </p>
          </div>
        </Column>
      </Grid>

      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            {error && (
              <InlineNotification
                kind="error"
                title="Error"
                subtitle={error}
                lowContrast
                style={{ marginBottom: '1.5rem' }}
                onCloseButtonClick={() => setError(null)}
              />
            )}

            <Tile style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>Action Details</h2>
              <FormGroup legendText="">
                <Grid condensed>
                  {/* Title */}
                  <Column sm={4} md={8} lg={16}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <TextInput
                        id="title"
                        name="title"
                        labelText="Title *"
                        placeholder="Brief description of the action"
                        required
                        disabled={submitting}
                      />
                    </div>
                  </Column>

                  {/* Action Type + Priority */}
                  <Column sm={4} md={4} lg={8}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <Select
                        id="action_type"
                        name="action_type"
                        labelText="Action Type *"
                        required
                        disabled={submitting}
                      >
                        <SelectItem value="" text="Select type..." />
                        <SelectItem value="corrective" text="Corrective" />
                        <SelectItem value="preventive" text="Preventive" />
                        <SelectItem value="immediate" text="Immediate" />
                        <SelectItem value="long_term" text="Long Term" />
                      </Select>
                    </div>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <Select
                        id="priority"
                        name="priority"
                        labelText="Priority *"
                        defaultValue="medium"
                        disabled={submitting}
                      >
                        <SelectItem value="low" text="Low" />
                        <SelectItem value="medium" text="Medium" />
                        <SelectItem value="high" text="High" />
                        <SelectItem value="critical" text="Critical" />
                      </Select>
                    </div>
                  </Column>

                  {/* Description */}
                  <Column sm={4} md={8} lg={16}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <TextArea
                        id="description"
                        name="description"
                        labelText="Description *"
                        placeholder="Detailed description of what needs to be done and why..."
                        rows={4}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </Column>

                  {/* Assigned To + Due Date */}
                  <Column sm={4} md={4} lg={8}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <Select
                        id="assigned_to"
                        name="assigned_to"
                        labelText="Assigned To"
                        disabled={submitting}
                      >
                        <SelectItem value="" text="Unassigned" />
                        {users.map((u) => (
                          <SelectItem
                            key={u.id}
                            value={u.id}
                            text={`${u.first_name} ${u.last_name}`}
                          />
                        ))}
                      </Select>
                    </div>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <DatePicker
                        datePickerType="single"
                        dateFormat="d/m/Y"
                        onChange={(dates: Date[]) => {
                          if (dates[0]) {
                            const d = dates[0]
                            const yyyy = d.getFullYear()
                            const mm = String(d.getMonth() + 1).padStart(2, '0')
                            const dd = String(d.getDate()).padStart(2, '0')
                            setDueDate(`${yyyy}-${mm}-${dd}`)
                          } else {
                            setDueDate('')
                          }
                        }}
                      >
                        <DatePickerInput
                          id="due_date"
                          labelText="Due Date *"
                          placeholder="dd/mm/yyyy"
                          disabled={submitting}
                        />
                      </DatePicker>
                    </div>
                  </Column>

                  {/* Verification Required */}
                  <Column sm={4} md={4} lg={8}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#525252',
                          letterSpacing: '0.32px',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Verification Required
                      </p>
                      <Toggle
                        id="verification_required"
                        labelText=""
                        labelA="No"
                        labelB="Yes"
                        toggled={verificationRequired}
                        onToggle={(checked: boolean) => setVerificationRequired(checked)}
                        disabled={submitting}
                      />
                    </div>
                  </Column>

                  {/* Source Reference */}
                  <Column sm={4} md={4} lg={8}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <TextInput
                        id="source_reference"
                        name="source_reference"
                        labelText="Source Reference"
                        helperText="Optional — e.g. INC-001, INS-042"
                        placeholder="e.g. INC-2026-00001"
                        disabled={submitting}
                      />
                    </div>
                  </Column>
                </Grid>
              </FormGroup>
            </Tile>

            {/* Form actions */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
              }}
            >
              <Button kind="primary" type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Action'}
              </Button>
              <Button
                kind="ghost"
                type="button"
                disabled={submitting}
                onClick={() => {
                  window.location.href = '/actions'
                }}
              >
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </form>
    </div>
  )
}
