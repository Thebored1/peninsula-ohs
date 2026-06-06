'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea,
  Form, InlineNotification,
} from '@carbon/react'
import { createContractorCompany } from '@/app/actions/contractors'

export function ContractorForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createContractorCompany(formData)
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Company Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={12} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="company_name"
                      name="company_name"
                      labelText="Company Name *"
                      required
                    />
                  </Column>
                  <Column sm={4} md={4} lg={6} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="abn"
                      name="abn"
                      labelText="ABN"
                      helperText="Australian Business Number (11 digits)"
                    />
                  </Column>
                  <Column sm={4} md={8} lg={12} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="address"
                      name="address"
                      labelText="Address"
                    />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Primary Contact</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={6} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="primary_contact_name"
                      name="primary_contact_name"
                      labelText="Contact Name"
                    />
                  </Column>
                  <Column sm={4} md={4} lg={6} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="primary_contact_email"
                      name="primary_contact_email"
                      labelText="Contact Email"
                      type="email"
                    />
                  </Column>
                  <Column sm={4} md={4} lg={6} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="primary_contact_phone"
                      name="primary_contact_phone"
                      labelText="Contact Phone"
                    />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Notes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <TextArea id="notes" name="notes" labelText="Notes (optional)" rows={3} />
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Add Contractor'}
              </Button>
              <Button kind="ghost" href="/contractors">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
