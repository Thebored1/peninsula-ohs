'use client'

import { useState } from 'react'
import {
  Grid, Column, Button, Select, SelectItem, TextInput,
  FormGroup, InlineNotification, InlineLoading,
} from '@carbon/react'

const TIMEZONES = [
  'UTC',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Darwin',
  'Australia/Hobart',
  'Pacific/Auckland',
  'Asia/Singapore',
]

const PROVINCES = [
  { value: 'ON', label: 'Ontario' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'AB', label: 'Alberta' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'NL', label: 'Newfoundland & Labrador' },
  { value: 'YT', label: 'Yukon' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
]

interface Org {
  name: string
  industry: string | null
  timezone: string
  contact_email: string | null
  contact_phone: string | null
  province: string | null
}

interface Props {
  org: Org
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function OrgForm({ org, action }: Props) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)
    const result = await action(new FormData(e.currentTarget))
    setLoading(false)
    if (result?.error) { setError(result.error) } else { setSuccess(true) }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <InlineNotification kind="error" title="Error" subtitle={error} onCloseButtonClick={() => setError(null)} lowContrast />
        </div>
      )}
      {success && (
        <div style={{ marginBottom: '1rem' }}>
          <InlineNotification kind="success" title="Saved" subtitle="Organisation settings updated." onCloseButtonClick={() => setSuccess(false)} lowContrast />
        </div>
      )}
      <Grid condensed>
        <Column sm={4} md={8} lg={16}>
          <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
            <TextInput id="name" name="name" labelText="Organisation Name *" defaultValue={org.name} required />
          </FormGroup>
        </Column>
        <Column sm={4} md={4} lg={8}>
          <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
            <TextInput id="industry" name="industry" labelText="Industry" defaultValue={org.industry ?? ''} placeholder="e.g. Construction, Mining, Manufacturing" />
          </FormGroup>
        </Column>
        <Column sm={4} md={4} lg={8}>
          <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
            <Select id="timezone" name="timezone" labelText="Timezone" defaultValue={org.timezone}>
              {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz} text={tz} />)}
            </Select>
          </FormGroup>
        </Column>
        <Column sm={4} md={4} lg={8}>
          <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
            <TextInput id="contact_email" name="contact_email" labelText="Contact Email" type="email" defaultValue={org.contact_email ?? ''} />
          </FormGroup>
        </Column>
        <Column sm={4} md={4} lg={8}>
          <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
            <TextInput id="contact_phone" name="contact_phone" labelText="Contact Phone" defaultValue={org.contact_phone ?? ''} />
          </FormGroup>
        </Column>
        <Column sm={4} md={4} lg={8}>
          <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
            <Select id="province" name="province" labelText="Province / Territory" defaultValue={org.province ?? ''}>
              <SelectItem value="" text="Select province..." />
              {PROVINCES.map((p) => <SelectItem key={p.value} value={p.value} text={p.label} />)}
            </Select>
          </FormGroup>
        </Column>
        <Column sm={4} md={8} lg={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {loading
              ? <InlineLoading description="Saving…" />
              : <Button kind="primary" type="submit">Save Changes</Button>}
          </div>
        </Column>
      </Grid>
    </form>
  )
}
