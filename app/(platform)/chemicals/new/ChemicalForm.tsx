'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  Form, FormGroup, Toggle, InlineNotification,
} from '@carbon/react'

interface Category { id: string; name: string }
interface PhysicalState { id: string; name: string }

interface Props {
  categories: Category[]
  physicalStates: PhysicalState[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function ChemicalForm({ categories, physicalStates, action }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isHazardous, setIsHazardous] = useState(true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('is_hazardous', String(isHazardous))
    const result = await action(fd)
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <InlineNotification kind="error" title="Error" subtitle={error} onCloseButtonClick={() => setError(null)} lowContrast />
        </div>
      )}
      <Form onSubmit={handleSubmit}>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Classification</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="category_id" name="category_id" labelText="Category">
                        <SelectItem value="" text="Select category…" />
                        {categories.map((c) => <SelectItem key={c.id} value={c.id} text={c.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="physical_state_id" name="physical_state_id" labelText="Physical State">
                        <SelectItem value="" text="Select state…" />
                        {physicalStates.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="quantity_unit" name="quantity_unit" labelText="Quantity Unit">
                        <SelectItem value="L" text="Litres (L)" />
                        <SelectItem value="mL" text="Millilitres (mL)" />
                        <SelectItem value="kg" text="Kilograms (kg)" />
                        <SelectItem value="g" text="Grams (g)" />
                        <SelectItem value="m3" text="Cubic metres (m³)" />
                        <SelectItem value="units" text="Units" />
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem', letterSpacing: '0.32px' }}>
                        Hazardous substance?
                      </p>
                      <Toggle
                        id="is_hazardous_toggle"
                        labelA="No"
                        labelB="Yes"
                        toggled={isHazardous}
                        onToggle={(v: boolean) => setIsHazardous(v)}
                        hideLabel
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Chemical Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="name" name="name" labelText="Chemical Name *" placeholder="e.g. Hydrochloric Acid" required />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="cas_number" name="cas_number" labelText="CAS Number" placeholder="e.g. 7647-01-0" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="un_number" name="un_number" labelText="UN Number" placeholder="e.g. UN1789" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="chemical_formula" name="chemical_formula" labelText="Chemical Formula" placeholder="e.g. HCl" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="storage_class" name="storage_class" labelText="Storage Class" placeholder="e.g. Class 8" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="">
                      <TextArea id="notes" name="notes" labelText="Notes" rows={3} placeholder="Any additional notes…" />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Chemical'}</Button>
              <Button kind="ghost" href="/chemicals">Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
