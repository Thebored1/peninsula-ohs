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
  InlineNotification,
} from '@carbon/react'

interface EnergyType {
  id: string
  name: string
  colour_code: string
}

interface Site {
  id: string
  name: string
}

interface Props {
  energyTypes: EnergyType[]
  sites: Site[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function LotoForm({ sites, action }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    <form onSubmit={handleSubmit}>
      <Grid>
        <Column sm={4} md={8} lg={12}>
          {error && (
            <div style={{ marginBottom: '1rem' }}>
              <InlineNotification kind="error" title="Error" subtitle={error} lowContrast />
            </div>
          )}

          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Procedure Details
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <TextInput
                id="title"
                name="title"
                labelText="Title"
                placeholder="e.g. Isolation procedure for conveyor motor M-201"
                required
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <TextArea
                id="description"
                name="description"
                labelText="Description"
                rows={4}
                placeholder="Describe the purpose and scope of this LOTO procedure…"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <TextInput
                id="asset_description"
                name="asset_description"
                labelText="Asset / Equipment Description"
                placeholder="e.g. Conveyor belt motor M-201, Level 3"
              />
              {sites.length > 0 ? (
                <Select id="site_id" name="site_id" labelText="Site (optional)">
                  <SelectItem value="" text="Select site…" />
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id} text={s.name} />
                  ))}
                </Select>
              ) : (
                <TextInput
                  id="site_id"
                  name="site_id"
                  labelText="Site (optional)"
                  placeholder="No sites configured"
                  disabled
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <TextInput
                id="next_review_date"
                name="next_review_date"
                labelText="Next Review Date (optional)"
                type="date"
              />
            </div>
          </Tile>

          <div
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#f4f4f4',
              borderLeft: '3px solid #0f62fe',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: '#525252',
            }}
          >
            The procedure will be saved as <strong>Draft</strong>. Isolation points can be added after creation. Once all isolation points are defined, the procedure can be approved.
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" kind="primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Procedure'}
            </Button>
            <Button kind="secondary" href="/loto">
              Cancel
            </Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
