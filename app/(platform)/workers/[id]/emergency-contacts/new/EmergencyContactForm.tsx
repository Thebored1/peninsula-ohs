'use client'

import { useState } from 'react'
import {
  Grid,
  Column,
  Tile,
  TextInput,
  TextArea,
  Toggle,
  Button,
  InlineNotification,
} from '@carbon/react'
import { createEmergencyContact } from '@/app/actions/emergency-contacts'

interface Props {
  workerId: string
}

export default function EmergencyContactForm({ workerId }: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPrimary, setIsPrimary] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.set('is_primary', isPrimary ? 'true' : 'false')

    const result = await createEmergencyContact(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="worker_id" value={workerId} />

      <Grid>
        <Column sm={4} md={8} lg={10}>
          {error && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error}
              style={{ marginBottom: '1rem' }}
            />
          )}

          <Tile style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1.25rem' }}>
              Contact Details
            </h2>
            <Grid>
              <Column sm={4} md={4} lg={8}>
                <TextInput
                  id="contact_name"
                  name="contact_name"
                  labelText="Contact Name"
                  placeholder="Full name of the emergency contact"
                  required
                  style={{ marginBottom: '1rem' }}
                />
              </Column>
              <Column sm={4} md={4} lg={8}>
                <TextInput
                  id="relationship"
                  name="relationship"
                  labelText="Relationship"
                  placeholder="e.g. Spouse, Parent, Sibling"
                  required
                  style={{ marginBottom: '1rem' }}
                />
              </Column>
              <Column sm={4} md={4} lg={8}>
                <TextInput
                  id="phone_primary"
                  name="phone_primary"
                  labelText="Primary Phone"
                  placeholder="+61 4xx xxx xxx"
                  required
                  style={{ marginBottom: '1rem' }}
                />
              </Column>
              <Column sm={4} md={4} lg={8}>
                <TextInput
                  id="phone_secondary"
                  name="phone_secondary"
                  labelText="Secondary Phone (optional)"
                  placeholder="+61 4xx xxx xxx"
                  style={{ marginBottom: '1rem' }}
                />
              </Column>
              <Column sm={4} md={4} lg={8}>
                <TextInput
                  id="email"
                  name="email"
                  labelText="Email (optional)"
                  placeholder="contact@example.com"
                  type="email"
                  style={{ marginBottom: '1rem' }}
                />
              </Column>
              <Column sm={4} md={4} lg={8}>
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Primary Contact
                  </p>
                  <Toggle
                    id="is_primary_toggle"
                    labelText=""
                    labelA="No"
                    labelB="Yes"
                    toggled={isPrimary}
                    onToggle={(checked: boolean) => setIsPrimary(checked)}
                  />
                </div>
              </Column>
              <Column sm={4} md={8} lg={16}>
                <TextArea
                  id="notes"
                  name="notes"
                  labelText="Notes (optional)"
                  placeholder="Any additional information about this contact"
                  rows={3}
                  style={{ marginBottom: '1rem' }}
                />
              </Column>
            </Grid>
          </Tile>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Contact'}
            </Button>
            <Button kind="ghost" type="button" onClick={() => window.history.back()}>
              Cancel
            </Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
