'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, FormGroup, Toggle, InlineNotification,
} from '@carbon/react'
import { updateChemical } from '@/app/actions/chemicals'

interface Category { id: string; name: string }
interface PhysicalState { id: string; name: string }

interface InitialData {
  name: string
  category_id: string | null
  physical_state_id: string | null
  cas_number: string | null
  un_number: string | null
  chemical_formula: string | null
  storage_class: string | null
  quantity_unit: string
  is_hazardous: boolean
  notes: string | null
}

interface Props {
  id: string
  initialData: InitialData
  categories: Category[]
  physicalStates: PhysicalState[]
}

const UNITS = ['L', 'mL', 'kg', 'g', 'each', 'drum', 'bottle', 'IBC']

export function EditChemicalForm({ id, initialData, categories, physicalStates }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isHazardous, setIsHazardous] = useState(initialData.is_hazardous)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('is_hazardous', String(isHazardous))
    startTransition(async () => {
      const result = await updateChemical(id, formData)
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Chemical Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput id="name" name="name" labelText="Chemical Name *" defaultValue={initialData.name} required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="category_id" name="category_id" labelText="Category" defaultValue={initialData.category_id ?? ''}>
                        <SelectItem value="" text="Select category…" />
                        {categories.map((c) => <SelectItem key={c.id} value={c.id} text={c.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="physical_state_id" name="physical_state_id" labelText="Physical State" defaultValue={initialData.physical_state_id ?? ''}>
                        <SelectItem value="" text="Select state…" />
                        {physicalStates.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="cas_number" name="cas_number" labelText="CAS Number" defaultValue={initialData.cas_number ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="un_number" name="un_number" labelText="UN Number" defaultValue={initialData.un_number ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="chemical_formula" name="chemical_formula" labelText="Chemical Formula" defaultValue={initialData.chemical_formula ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="storage_class" name="storage_class" labelText="Storage Class" defaultValue={initialData.storage_class ?? ''} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="quantity_unit" name="quantity_unit" labelText="Quantity Unit" defaultValue={initialData.quantity_unit}>
                        {UNITS.map((u) => <SelectItem key={u} value={u} text={u} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem' }}>Hazardous substance?</p>
                    <Toggle id="is_hazardous" labelA="No" labelB="Yes" toggled={isHazardous} onToggle={(c: boolean) => setIsHazardous(c)} hideLabel />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="notes" name="notes" labelText="Notes" defaultValue={initialData.notes ?? ''} rows={2} />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Changes'}</Button>
              <Button kind="ghost" href={`/chemicals/${id}`}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
