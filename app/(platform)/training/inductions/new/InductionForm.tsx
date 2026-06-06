'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, InlineNotification,
} from '@carbon/react'
import { createInductionProgram } from '@/app/actions/training'

interface Site { id: string; name: string }
interface Props { sites: Site[] }

const APPLIES_TO_OPTIONS = [
  { value: 'all', label: 'All (everyone)' },
  { value: 'employees', label: 'Employees only' },
  { value: 'contractors', label: 'Contractors only' },
  { value: 'visitors', label: 'Visitors only' },
]

export function InductionForm({ sites }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createInductionProgram(formData)
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Program Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput id="name" name="name" labelText="Program Name *" required />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="description" name="description" labelText="Description" rows={3} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select id="applies_to" name="applies_to" labelText="Applies To" defaultValue="all">
                      {APPLIES_TO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} text={o.label} />
                      ))}
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select id="site_id" name="site_id" labelText="Site (optional)" defaultValue="">
                      <SelectItem value="" text="All sites" />
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id} text={s.name} />
                      ))}
                    </Select>
                  </Column>
                </Grid>
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Create Program'}
              </Button>
              <Button kind="ghost" href="/training/inductions">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
