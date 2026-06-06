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

interface Asset { id: string; name: string; asset_number: string | null }
interface MaintenanceType { id: string; name: string }

interface Props {
  assets: Asset[]
  maintenanceTypes: MaintenanceType[]
  defaultAssetId: string | null
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function MaintenanceForm({ assets, maintenanceTypes, defaultAssetId, action }: Props) {
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
          {/* Asset & Type */}
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
                      <Select
                        id="asset_id"
                        name="asset_id"
                        labelText="Asset *"
                        required
                        defaultValue={defaultAssetId ?? ''}
                      >
                        <SelectItem value="" text="Select asset…" />
                        {assets.map((a) => (
                          <SelectItem
                            key={a.id}
                            value={a.id}
                            text={a.asset_number ? `${a.name} (${a.asset_number})` : a.name}
                          />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="">
                      <Select
                        id="maintenance_type_id"
                        name="maintenance_type_id"
                        labelText="Maintenance Type *"
                        required
                      >
                        <SelectItem value="" text="Select type…" />
                        {maintenanceTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id} text={t.name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Work Details */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Work Details
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="description"
                        name="description"
                        labelText="Work Description *"
                        placeholder="Describe the maintenance work performed…"
                        rows={3}
                        required
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="performed_at"
                        name="performed_at"
                        labelText="Date Performed *"
                        type="date"
                        required
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="duration_hours"
                        name="duration_hours"
                        labelText="Duration (hours)"
                        type="number"
                        placeholder="e.g. 2.5"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="findings"
                        name="findings"
                        labelText="Findings"
                        placeholder="Any issues found or observations during the work…"
                        rows={3}
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Performed By */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Performed By
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="performed_by_name"
                        name="performed_by_name"
                        labelText="Person Name"
                        placeholder="Technician or contractor name"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="contractor_company"
                        name="contractor_company"
                        labelText="Contractor Company"
                        placeholder="External company name (if applicable)"
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Costs & Scheduling */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Costs &amp; Scheduling
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="parts_cost"
                        name="parts_cost"
                        labelText="Parts Cost ($)"
                        type="number"
                        placeholder="0.00"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="labour_cost"
                        name="labour_cost"
                        labelText="Labour Cost ($)"
                        type="number"
                        placeholder="0.00"
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

          {/* Notes */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Notes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <FormGroup legendText="">
                  <TextArea
                    id="notes"
                    name="notes"
                    labelText="Additional Notes"
                    placeholder="Any other relevant information…"
                    rows={3}
                  />
                </FormGroup>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save Record'}
              </Button>
              <Button kind="ghost" href="/maintenance">
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
