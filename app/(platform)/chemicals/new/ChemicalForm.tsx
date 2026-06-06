'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  Form, FormGroup, Toggle, InlineNotification, NumberInput, DatePicker,
  DatePickerInput,
} from '@carbon/react'
import { createClient } from '@/lib/supabase/client'

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
  const [sdsIssueDate, setSdsIssueDate] = useState('')
  const [sdsReviewDate, setSdsReviewDate] = useState('')

  function formatDateForInput(dates: readonly Date[]): string {
    if (!dates || dates.length === 0) return ''
    const d = dates[0]
    if (!(d instanceof Date) || isNaN(d.getTime())) return ''
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${year}-${month}-${day}`
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('is_hazardous', String(isHazardous))

    // FILE UPLOAD PATTERN
    const supabase = createClient()
    const fileInput = e.currentTarget.querySelector('input[data-upload="true"]') as HTMLInputElement
    const file = fileInput?.files?.[0]
    if (file) {
      const ext = file.name.split('.').pop() ?? 'bin'
      const uploadPath = crypto.randomUUID() + '.' + ext
      const { data: upload } = await supabase.storage.from('sds-documents').upload(uploadPath, file, { upsert: true })
      if (upload) {
        const { data: urlData } = supabase.storage.from('sds-documents').getPublicUrl(upload.path)
        formData.set('sds_file_url', urlData.publicUrl)
        formData.set('sds_file_name', file.name)
      }
    }

    // Inject date values from state (DatePickerInput doesn't submit as a form field)
    if (sdsIssueDate) formData.set('sds_issue_date', sdsIssueDate)
    if (sdsReviewDate) formData.set('sds_review_date', sdsReviewDate)

    const result = await action(formData)
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
          {/* ── Chemical Details ── */}
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

          {/* ── Classification ── */}
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

          {/* ── Supplier & Manufacturer ── */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Supplier &amp; Manufacturer</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="supplier_name" name="supplier_name" labelText="Supplier Name" placeholder="e.g. Sigma-Aldrich" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="manufacturer_name" name="manufacturer_name" labelText="Manufacturer Name" placeholder="e.g. Merck KGaA" />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* ── Storage & Current Inventory ── */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Storage &amp; Current Inventory</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="storage_location"
                        name="storage_location"
                        labelText="Storage Location"
                        placeholder="e.g. Flammables Cabinet A, Lab 2"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <NumberInput
                        id="current_quantity"
                        name="current_quantity"
                        label="Current Quantity"
                        min={0}
                        step={0.01}
                        allowEmpty
                      />
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
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* ── Exposure Standards ── */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Exposure Standards</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={5}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <NumberInput
                        id="exposure_standard_twa"
                        name="exposure_standard_twa"
                        label="TWA Limit"
                        min={0}
                        step={0.01}
                        allowEmpty
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={5}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <NumberInput
                        id="exposure_standard_stel"
                        name="exposure_standard_stel"
                        label="STEL Limit"
                        min={0}
                        step={0.01}
                        allowEmpty
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={6}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="exposure_standard_unit" name="exposure_standard_unit" labelText="Unit">
                        <SelectItem value="ppm" text="ppm" />
                        <SelectItem value="mg/m³" text="mg/m³" />
                        <SelectItem value="mg/L" text="mg/L" />
                        <SelectItem value="%" text="%" />
                      </Select>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* ── Safety Data Sheet (SDS) ── */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Safety Data Sheet (SDS)</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#525252', letterSpacing: '0.32px', marginBottom: '0.5rem' }}>
                    Upload SDS Document (PDF)
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    data-upload="true"
                    style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#161616' }}
                  />
                </div>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <DatePicker
                        datePickerType="single"
                        dateFormat="d/m/Y"
                        onChange={(dates: readonly Date[]) => setSdsIssueDate(formatDateForInput(dates))}
                      >
                        <DatePickerInput
                          id="sds_issue_date"
                          labelText="SDS Issue Date"
                          placeholder="dd/mm/yyyy"
                        />
                      </DatePicker>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <DatePicker
                        datePickerType="single"
                        dateFormat="d/m/Y"
                        onChange={(dates: readonly Date[]) => setSdsReviewDate(formatDateForInput(dates))}
                      >
                        <DatePickerInput
                          id="sds_review_date"
                          labelText="SDS Review Due Date"
                          placeholder="dd/mm/yyyy"
                        />
                      </DatePicker>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* ── Emergency Response ── */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Emergency Response (from SDS)</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="emergency_first_aid"
                        name="emergency_first_aid"
                        labelText="First Aid Measures (SDS Section 4)"
                        rows={4}
                        placeholder="Describe first aid procedures…"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="emergency_spill"
                        name="emergency_spill"
                        labelText="Spill Response Procedures (SDS Section 6)"
                        rows={4}
                        placeholder="Describe spill containment and cleanup…"
                      />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="">
                      <TextArea
                        id="emergency_fire"
                        name="emergency_fire"
                        labelText="Fire Fighting Measures (SDS Section 5)"
                        rows={4}
                        placeholder="Describe fire fighting procedures and extinguishing media…"
                      />
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
