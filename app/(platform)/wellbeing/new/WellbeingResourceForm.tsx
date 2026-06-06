'use client'

import { useState } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  Toggle,
  Form,
  FormGroup,
  InlineNotification,
} from '@carbon/react'
import { createWellbeing } from '@/app/actions/wellbeing'

interface Site {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
}

interface Props {
  sites: Site[]
  departments: Department[]
}

export function WellbeingResourceForm({ sites, departments }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExternal, setIsExternal] = useState(true)
  const [isActive, setIsActive] = useState(true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('is_external', String(isExternal))
      formData.set('is_active', String(isActive))
      const result = await createWellbeing(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
            lowContrast
          />
        </div>
      )}

      <Form onSubmit={handleSubmit}>
        <Grid>
          {/* Resource Details */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Resource Details
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="title"
                        name="title"
                        labelText="Title *"
                        placeholder="e.g. Employee Assistance Program, Beyond Blue Helpline"
                        required
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="resource_type"
                        name="resource_type"
                        labelText="Resource Type *"
                        required
                      >
                        <SelectItem value="" text="Select type…" />
                        <SelectItem value="eap" text="EAP (Employee Assistance Program)" />
                        <SelectItem value="helpline" text="Helpline / Crisis Line" />
                        <SelectItem value="internal_support" text="Internal Support" />
                        <SelectItem value="article" text="Article / Guide" />
                        <SelectItem value="policy" text="Policy / Document" />
                        <SelectItem value="app" text="App / Digital Tool" />
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="description"
                        name="description"
                        labelText="Description"
                        placeholder="Brief description of this resource and how it helps employees…"
                        rows={3}
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Contact Information */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Contact Information
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="contact_name"
                        name="contact_name"
                        labelText="Contact Name"
                        placeholder="e.g. Support Team, Dr. Jane Smith"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="contact_phone"
                        name="contact_phone"
                        labelText="Contact Phone"
                        placeholder="e.g. 1800 123 456"
                        type="tel"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="contact_email"
                        name="contact_email"
                        labelText="Contact Email"
                        placeholder="e.g. support@eap.com.au"
                        type="email"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="website_url"
                        name="website_url"
                        labelText="Website URL"
                        placeholder="https://…"
                        type="url"
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Settings */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Settings
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1.5rem' }}>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#525252',
                          marginBottom: '0.5rem',
                          letterSpacing: '0.32px',
                        }}
                      >
                        External resource?
                      </p>
                      <Toggle
                        id="is_external_toggle"
                        labelA="Internal"
                        labelB="External"
                        toggled={isExternal}
                        onToggle={(checked: boolean) => setIsExternal(checked)}
                        hideLabel
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1.5rem' }}>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#525252',
                          marginBottom: '0.5rem',
                          letterSpacing: '0.32px',
                        }}
                      >
                        Active?
                      </p>
                      <Toggle
                        id="is_active_toggle"
                        labelA="Inactive"
                        labelB="Active"
                        toggled={isActive}
                        onToggle={(checked: boolean) => setIsActive(checked)}
                        hideLabel
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Actions */}
          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save Resource'}
              </Button>
              <Button kind="ghost" href="/wellbeing">
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
