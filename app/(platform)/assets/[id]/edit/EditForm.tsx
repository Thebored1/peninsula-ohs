'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, FormGroup, InlineNotification,
} from '@carbon/react'
import { updateAsset } from '@/app/actions/assets'

interface AssetType { id: string; name: string }
interface AssetStatus { id: string; name: string }

interface InitialData {
  name: string
  asset_type_id: string | null
  status_id: string | null
  serial_number: string | null
  asset_tag: string | null
  manufacturer: string | null
  model: string | null
  year_of_manufacture: number | null
  purchase_date: string | null
  warranty_expiry_date: string | null
  replacement_cost: number | null
  location_details: string | null
  inspection_frequency: string | null
  next_inspection_due: string | null
  next_maintenance_due: string | null
  description: string | null
  notes: string | null
  risk_classification: string | null
}

interface Props {
  id: string
  initialData: InitialData
  assetTypes: AssetType[]
  assetStatuses: AssetStatus[]
}

const INSPECTION_FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'biannual', 'annually']

export function EditAssetForm({ id, initialData, assetTypes, assetStatuses }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateAsset(id, formData)
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Asset Information</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput id="name" name="name" labelText="Asset Name *" defaultValue={initialData.name} required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="asset_type_id" name="asset_type_id" labelText="Asset Type *" defaultValue={initialData.asset_type_id ?? ''} required>
                        <SelectItem value="" text="Select type…" />
                        {assetTypes.map((t) => <SelectItem key={t.id} value={t.id} text={t.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="status_id" name="status_id" labelText="Status *" defaultValue={initialData.status_id ?? ''} required>
                        <SelectItem value="" text="Select status…" />
                        {assetStatuses.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="manufacturer" name="manufacturer" labelText="Manufacturer" defaultValue={initialData.manufacturer ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="model" name="model" labelText="Model" defaultValue={initialData.model ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="serial_number" name="serial_number" labelText="Serial Number" defaultValue={initialData.serial_number ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="asset_tag" name="asset_tag" labelText="Asset Tag" defaultValue={initialData.asset_tag ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="year_of_manufacture" name="year_of_manufacture" labelText="Year of Manufacture" type="number" defaultValue={initialData.year_of_manufacture != null ? String(initialData.year_of_manufacture) : ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="location_details" name="location_details" labelText="Location" defaultValue={initialData.location_details ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="risk_classification" name="risk_classification" labelText="Risk Classification" defaultValue={initialData.risk_classification ?? 'low'}>
                        <SelectItem value="low" text="Low" />
                        <SelectItem value="medium" text="Medium" />
                        <SelectItem value="high" text="High" />
                        <SelectItem value="critical" text="Critical" />
                      </Select>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Commercial &amp; Maintenance</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="purchase_date" name="purchase_date" labelText="Purchase Date" type="date" defaultValue={initialData.purchase_date ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="warranty_expiry_date" name="warranty_expiry_date" labelText="Warranty Expiry" type="date" defaultValue={initialData.warranty_expiry_date ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="replacement_cost" name="replacement_cost" labelText="Replacement Cost (AUD)" type="number" step="0.01" defaultValue={initialData.replacement_cost != null ? String(initialData.replacement_cost) : ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="inspection_frequency" name="inspection_frequency" labelText="Inspection Frequency" defaultValue={initialData.inspection_frequency ?? ''}>
                        <SelectItem value="" text="Not set" />
                        {INSPECTION_FREQUENCIES.map((f) => <SelectItem key={f} value={f} text={f.charAt(0).toUpperCase() + f.slice(1)} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="next_inspection_due" name="next_inspection_due" labelText="Next Inspection Due" type="date" defaultValue={initialData.next_inspection_due ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="next_maintenance_due" name="next_maintenance_due" labelText="Next Maintenance Due" type="date" defaultValue={initialData.next_maintenance_due ?? ''} />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Description &amp; Notes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="description" name="description" labelText="Description" defaultValue={initialData.description ?? ''} rows={3} />
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <TextArea id="notes" name="notes" labelText="Notes" defaultValue={initialData.notes ?? ''} rows={2} />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Changes'}</Button>
              <Button kind="ghost" href={`/assets/${id}`}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
