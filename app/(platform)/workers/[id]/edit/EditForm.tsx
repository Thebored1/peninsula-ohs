'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, FormGroup, Toggle, InlineNotification,
} from '@carbon/react'
import { updateWorkerProfile } from '@/app/actions/workers'

interface Site { id: string; name: string }
interface Department { id: string; name: string }

interface InitialData {
  first_name: string
  last_name: string
  email: string
  phone: string | null
  mobile: string | null
  job_title: string | null
  employment_type: string | null
  employee_id: string | null
  hire_date: string | null
  primary_site_id: string | null
  primary_department_id: string | null
  notes: string | null
  is_active: boolean
}

interface Props {
  id: string
  initialData: InitialData
  sites: Site[]
  departments: Department[]
}

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contractor', 'casual', 'volunteer']

export function EditWorkerForm({ id, initialData, sites, departments }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(initialData.is_active)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('is_active', String(isActive))
    startTransition(async () => {
      const result = await updateWorkerProfile(id, formData)
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
                    <TextInput id="first_name" name="first_name" labelText="First Name *" defaultValue={initialData.first_name} required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="last_name" name="last_name" labelText="Last Name *" defaultValue={initialData.last_name} required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="phone" name="phone" labelText="Phone" defaultValue={initialData.phone ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="mobile" name="mobile" labelText="Mobile" defaultValue={initialData.mobile ?? ''} />
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
                    <TextInput id="job_title" name="job_title" labelText="Job Title" defaultValue={initialData.job_title ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="employment_type" name="employment_type" labelText="Employment Type" defaultValue={initialData.employment_type ?? ''}>
                        <SelectItem value="" text="Select type…" />
                        {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t} text={t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="employee_id" name="employee_id" labelText="Employee ID" defaultValue={initialData.employee_id ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="hire_date" name="hire_date" labelText="Hire Date" type="date" defaultValue={initialData.hire_date ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="primary_site_id" name="primary_site_id" labelText="Primary Site" defaultValue={initialData.primary_site_id ?? ''}>
                        <SelectItem value="" text="Select site…" />
                        {sites.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="primary_department_id" name="primary_department_id" labelText="Department" defaultValue={initialData.primary_department_id ?? ''}>
                        <SelectItem value="" text="Select department…" />
                        {departments.map((d) => <SelectItem key={d.id} value={d.id} text={d.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem' }}>Active?</p>
                    <Toggle id="is_active" labelA="Inactive" labelB="Active" toggled={isActive} onToggle={(c: boolean) => setIsActive(c)} hideLabel />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Notes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <TextArea id="notes" name="notes" labelText="Notes" defaultValue={initialData.notes ?? ''} rows={3} />
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Changes'}</Button>
              <Button kind="ghost" href={`/workers/${id}`}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
