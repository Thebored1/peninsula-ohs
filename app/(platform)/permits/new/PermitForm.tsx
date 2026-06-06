'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  InlineNotification, Tag,
} from '@carbon/react'

interface PermitType {
  id: string; code: string; name: string; description: string | null
  rescue_plan_required: boolean; isolation_required: boolean; max_duration_hours: number | null
}
interface User { id: string; first_name: string; last_name: string }

interface Props {
  permitTypes: PermitType[]
  users: User[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function PermitForm({ permitTypes, users, action }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<PermitType | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setLoading(true)
    const result = await action(new FormData(e.currentTarget))
    if (result?.error) { setError(result.error); setLoading(false) }
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
              Permit Details
            </h2>

            {/* Row 1: Permit Type + Responsible Person */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <Select
                id="permit_type_id"
                name="permit_type_id"
                labelText="Permit Type"
                required
                onChange={e => setSelectedType(permitTypes.find(t => t.id === e.target.value) ?? null)}
              >
                <SelectItem value="" text="Select permit type…" />
                {permitTypes.map(t => <SelectItem key={t.id} value={t.id} text={t.name} />)}
              </Select>
              <Select id="responsible_person_id" name="responsible_person_id" labelText="Responsible Person (optional)">
                <SelectItem value="" text="Assign later" />
                {users.map(u => <SelectItem key={u.id} value={u.id} text={`${u.first_name} ${u.last_name}`} />)}
              </Select>
            </div>

            {/* Type info banner */}
            {selectedType && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f4f4f4', borderLeft: '3px solid #0f62fe', marginBottom: '1rem', fontSize: '0.875rem' }}>
                <p style={{ color: '#161616', marginBottom: '0.375rem' }}>{selectedType.description}</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedType.rescue_plan_required && <Tag type="red" size="sm">Rescue Plan Required</Tag>}
                  {selectedType.isolation_required && <Tag type="red" size="sm">Isolation Required</Tag>}
                  {selectedType.max_duration_hours && (
                    <Tag type="blue" size="sm">Max {selectedType.max_duration_hours}h</Tag>
                  )}
                </div>
              </div>
            )}

            {/* Title */}
            <div style={{ marginBottom: '1rem' }}>
              <TextInput id="title" name="title" labelText="Title / Work Description (brief)"
                placeholder="e.g. Welding repair on vessel B-103" required />
            </div>

            {/* Work description */}
            <div style={{ marginBottom: '1rem' }}>
              <TextArea id="work_description" name="work_description" labelText="Detailed Work Description"
                rows={3} placeholder="Full description of the work to be performed…" required />
            </div>

            {/* Location */}
            <div style={{ marginBottom: '1rem' }}>
              <TextInput id="exact_location" name="exact_location" labelText="Exact Location"
                placeholder="e.g. Level 2, Tank Farm, Grid B-4" />
            </div>

            {/* Row 2: Valid From + Valid Until */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <TextInput id="valid_from" name="valid_from" labelText="Valid From" type="datetime-local" />
              <TextInput id="valid_until" name="valid_until" labelText="Valid Until" type="datetime-local"
                helperText={selectedType?.max_duration_hours ? `Max ${selectedType.max_duration_hours}h for this type` : undefined} />
            </div>

            {/* Rescue plan (conditional) */}
            {selectedType?.rescue_plan_required && (
              <TextArea id="rescue_plan" name="rescue_plan" labelText="Rescue Plan" rows={3}
                placeholder="Describe the rescue procedure if something goes wrong…" />
            )}
          </Tile>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" kind="primary" disabled={loading}>{loading ? 'Creating…' : 'Create Permit'}</Button>
            <Button kind="secondary" href="/permits">Cancel</Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
