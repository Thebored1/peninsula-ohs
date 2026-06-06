'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, Form, InlineNotification,
  Select, SelectItem, FormGroup,
} from '@carbon/react'
import { signInContractor } from '@/app/actions/contractors'

interface Worker {
  id: string
  first_name: string
  last_name: string
  role: string | null
  company_name: string
}

interface Site {
  id: string
  name: string
}

interface Props {
  workers: Worker[]
  sites: Site[]
}

export function SignInForm({ workers, sites }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await signInContractor(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={10}>
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              border: '1px solid #24a148',
              borderRadius: '2px',
              background: '#defbe6',
            }}
          >
            <p style={{ fontSize: '1.125rem', color: '#24a148', fontWeight: 600, marginBottom: '0.5rem' }}>
              Worker signed in successfully
            </p>
            <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1.5rem' }}>
              The sign-in has been recorded in the site access log.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Button kind="primary" href="/contractors/sign-in">Sign In Another</Button>
              <Button kind="secondary" href="/contractors/access-log">View Access Log</Button>
            </div>
          </div>
        </Column>
      </Grid>
    )
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
          <Column sm={4} md={8} lg={10}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Sign In Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                  <Select
                    id="contractor_worker_id"
                    name="contractor_worker_id"
                    labelText="Contractor Worker *"
                    defaultValue=""
                    required
                  >
                    <SelectItem value="" text="Select worker…" />
                    {workers.map((w) => (
                      <SelectItem
                        key={w.id}
                        value={w.id}
                        text={`${w.first_name} ${w.last_name}${w.role ? ` — ${w.role}` : ''} (${w.company_name})`}
                      />
                    ))}
                  </Select>
                </FormGroup>

                <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                  <Select
                    id="site_id"
                    name="site_id"
                    labelText="Site"
                    defaultValue=""
                  >
                    <SelectItem value="" text="Select site…" />
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id} text={s.name} />
                    ))}
                  </Select>
                </FormGroup>

                <TextInput
                  id="purpose"
                  name="purpose"
                  labelText="Purpose / Work Description"
                  placeholder="e.g. Electrical maintenance, Delivery, Inspection"
                />
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Signing In…' : 'Sign In'}
              </Button>
              <Button kind="ghost" href="/contractors/access-log">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
