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
} from '@carbon/react'
import { createHazardReport } from '@/app/actions/hazards'

export default function HazardForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
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
              <Tile style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>Hazard Details</h2>
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

                  <div style={{ marginBottom: '2rem' }}>
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
