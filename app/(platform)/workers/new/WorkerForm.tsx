'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, FormGroup, InlineNotification,
} from '@carbon/react'
import { createWorkerProfile } from '@/app/actions/workers'

interface Site { id: string; name: string }
interface Department { id: string; name: string }

interface Props {
  sites: Site[]
  departments: Department[]
}

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contractor', 'casual', 'volunteer']

export function WorkerForm({ sites, departments }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createWorkerProfile(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <InlineNotification kind="error" title="Error" subtitle={error} onCloseButtonClick={() => setError(null)} style={{ marginBottom: '1.5rem', maxWidth: '100%' }} />
      )}
      <Form onSubmit={handleSubmit}>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Personal Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="first_name" name="first_name" labelText="First Name *" required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="last_name" name="last_name" labelText="Last Name *" required />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput id="email" name="email" labelText="Email *" type="email" helperText="An account will be created — the worker can set their password via password reset." required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="phone" name="phone" labelText="Phone" />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="mobile" name="mobile" labelText="Mobile" />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Employment</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="job_title" name="job_title" labelText="Job Title" />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="employment_type" name="employment_type" labelText="Employment Type" defaultValue="">
                        <SelectItem value="" text="Select type…" />
                        {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t} text={t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="employee_id" name="employee_id" labelText="Employee ID" />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="hire_date" name="hire_date" labelText="Hire Date" type="date" />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="primary_site_id" name="primary_site_id" labelText="Primary Site" defaultValue="">
                        <SelectItem value="" text="Select site…" />
                        {sites.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="primary_department_id" name="primary_department_id" labelText="Department" defaultValue="">
                        <SelectItem value="" text="Select department…" />
                        {departments.map((d) => <SelectItem key={d.id} value={d.id} text={d.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Notes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <TextArea id="notes" name="notes" labelText="Notes (optional)" rows={2} />
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create Worker'}</Button>
              <Button kind="ghost" href="/workers">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
