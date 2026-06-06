'use client'

import { useState } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  Select,
  SelectItem,
  TextInput,
  TextArea,
  Form,
  FormGroup,
  InlineNotification,
} from '@carbon/react'

interface RegulatoryBody {
  id: string
  name: string
}

interface Props {
  regulatoryBodies: RegulatoryBody[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function RegulatoryForm({ regulatoryBodies, action }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await action(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
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
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Standard Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="standard_code"
                        name="standard_code"
                        labelText="Standard Code *"
                        placeholder="e.g. AS/NZS 4801:2001"
                        required
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="version"
                        name="version"
                        labelText="Version"
                        placeholder="e.g. 1.0"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="title"
                        name="title"
                        labelText="Title *"
                        placeholder="Full name of the standard or regulation"
                        required
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="regulatory_body_id"
                        name="regulatory_body_id"
                        labelText="Regulatory Body"
                      >
                        <SelectItem value="" text="Select body…" />
                        {regulatoryBodies.map((b) => (
                          <SelectItem key={b.id} value={b.id} text={b.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="jurisdiction"
                        name="jurisdiction"
                        labelText="Jurisdiction"
                        placeholder="e.g. Australia, NSW, National"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="effective_date"
                        name="effective_date"
                        labelText="Effective Date"
                        type="date"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select
                        id="status"
                        name="status"
                        labelText="Status"
                        defaultValue="current"
                      >
                        <SelectItem value="current" text="Current" />
                        <SelectItem value="superseded" text="Superseded" />
                        <SelectItem value="withdrawn" text="Withdrawn" />
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="">
                      <TextArea
                        id="description"
                        name="description"
                        labelText="Description"
                        rows={4}
                        placeholder="Brief description of the standard's scope and applicability…"
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save Standard'}
              </Button>
              <Button kind="ghost" href="/regulatory">
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
