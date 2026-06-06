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

interface AssetType { id: string; name: string }
interface AssetStatus { id: string; name: string }

interface Props {
  assetTypes: AssetType[]
  assetStatuses: AssetStatus[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function AssetForm({ assetTypes, assetStatuses, action }: Props) {
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
          {/* Classification */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Classification
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="">
                      <Select id="asset_type_id" name="asset_type_id" labelText="Asset Type *" required>
                        <SelectItem value="" text="Select asset type…" />
                        {assetTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id} text={t.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="">
                      <Select id="status_id" name="status_id" labelText="Status *" required>
                        <SelectItem value="" text="Select status…" />
                        {assetStatuses.map((s) => (
                          <SelectItem key={s.id} value={s.id} text={s.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="">
                      <Select id="risk_classification" name="risk_classification" labelText="Risk Classification" defaultValue="low">
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
          </Column>

          {/* Identity */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Asset Details
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="name"
                        name="name"
                        labelText="Asset Name *"
                        placeholder="e.g. Forklift #3, Air Compressor Unit B"
                        required
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="serial_number"
                        name="serial_number"
                        labelText="Serial Number"
                        placeholder="Manufacturer serial number"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="asset_tag"
                        name="asset_tag"
                        labelText="Asset Tag / Barcode"
                        placeholder="Internal tag or RFID"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="manufacturer"
                        name="manufacturer"
                        labelText="Manufacturer"
                        placeholder="e.g. Toyota, Atlas Copco"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="model"
                        name="model"
                        labelText="Model"
                        placeholder="Model name or number"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="year_of_manufacture"
                        name="year_of_manufacture"
                        labelText="Year of Manufacture"
                        type="number"
                        placeholder="e.g. 2019"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="location_details"
                        name="location_details"
                        labelText="Location"
                        placeholder="e.g. Warehouse B, Bay 3"
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Commercial */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Commercial
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="purchase_date"
                        name="purchase_date"
                        labelText="Purchase Date"
                        type="date"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="warranty_expiry_date"
                        name="warranty_expiry_date"
                        labelText="Warranty Expiry"
                        type="date"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="replacement_cost"
                        name="replacement_cost"
                        labelText="Replacement Cost ($)"
                        type="number"
                        placeholder="0.00"
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Maintenance & Inspection Schedule */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Maintenance &amp; Inspection
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="inspection_frequency" name="inspection_frequency" labelText="Inspection Frequency">
                        <SelectItem value="" text="Not set" />
                        <SelectItem value="daily" text="Daily" />
                        <SelectItem value="weekly" text="Weekly" />
                        <SelectItem value="monthly" text="Monthly" />
                        <SelectItem value="quarterly" text="Quarterly" />
                        <SelectItem value="annually" text="Annually" />
                        <SelectItem value="as_required" text="As Required" />
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="next_inspection_due"
                        name="next_inspection_due"
                        labelText="Next Inspection Due"
                        type="date"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="next_maintenance_due"
                        name="next_maintenance_due"
                        labelText="Next Maintenance Due"
                        type="date"
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Description & Notes */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Description &amp; Notes
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="description"
                        name="description"
                        labelText="Description"
                        placeholder="Brief description of the asset and its purpose…"
                        rows={3}
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="">
                      <TextArea
                        id="notes"
                        name="notes"
                        labelText="Notes"
                        placeholder="Any additional notes…"
                        rows={3}
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
                {loading ? 'Saving…' : 'Save Asset'}
              </Button>
              <Button kind="ghost" href="/assets">
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
