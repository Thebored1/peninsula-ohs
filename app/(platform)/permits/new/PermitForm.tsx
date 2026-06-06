'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  InlineNotification, Tag, Checkbox,
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

const PPE_ITEMS = [
  'Hard Hat', 'Safety Vest', 'Safety Boots', 'Gloves',
  'Safety Glasses', 'Hearing Protection', 'Respirator', 'Full Body Harness',
]

const CHECKLIST_ITEMS = [
  'Site hazards identified',
  'Controls verified in place',
  'PPE available on site',
  'Emergency procedures reviewed',
  'All workers briefed',
]

const RISK_LEVELS = ['low', 'medium', 'high', 'critical']
const CONTROL_TYPES = ['elimination', 'substitution', 'engineering', 'administrative', 'ppe']

export function PermitForm({ permitTypes, users, action }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<PermitType | null>(null)

  // Hazards
  const [hazards, setHazards] = useState<Array<{ description: string; riskLevel: string }>>([
    { description: '', riskLevel: 'medium' },
  ])

  // Control measures
  const [controls, setControls] = useState<Array<{ description: string; type: string }>>([
    { description: '', type: 'administrative' },
  ])

  // PPE
  const [selectedPPE, setSelectedPPE] = useState<string[]>([])
  const [customPPE, setCustomPPE] = useState('')

  // Workers
  const [workers, setWorkers] = useState<Array<{ workerId: string; workerName: string; role: string }>>([
    { workerId: '', workerName: '', role: '' },
  ])

  // Pre-work checklist
  const [checklist, setChecklist] = useState<string[]>([])

  function toggleChecklist(item: string) {
    setChecklist(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  function togglePPE(item: string) {
    setSelectedPPE(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  function addCustomPPE() {
    const trimmed = customPPE.trim()
    if (trimmed && !selectedPPE.includes(trimmed)) {
      setSelectedPPE(prev => [...prev, trimmed])
      setCustomPPE('')
    }
  }

  function updateHazard(index: number, field: 'description' | 'riskLevel', value: string) {
    setHazards(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h))
  }

  function removeHazard(index: number) {
    setHazards(prev => prev.filter((_, i) => i !== index))
  }

  function updateControl(index: number, field: 'description' | 'type', value: string) {
    setControls(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  function removeControl(index: number) {
    setControls(prev => prev.filter((_, i) => i !== index))
  }

  function updateWorker(index: number, field: 'workerId' | 'workerName' | 'role', value: string) {
    setWorkers(prev => prev.map((w, i) => {
      if (i !== index) return w
      const updated = { ...w, [field]: value }
      if (field === 'workerId' && value) {
        const user = users.find(u => u.id === value)
        if (user) updated.workerName = `${user.first_name} ${user.last_name}`
      }
      return updated
    }))
  }

  function removeWorker(index: number) {
    setWorkers(prev => prev.filter((_, i) => i !== index))
  }

  const allChecked = CHECKLIST_ITEMS.every(i => checklist.includes(i))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    formData.set('hazards', JSON.stringify(
      hazards.filter(h => h.description.trim())
    ))
    formData.set('controls', JSON.stringify(
      controls.filter(c => c.description.trim())
    ))
    formData.set('ppe_requirements', JSON.stringify(
      selectedPPE.map(item => ({ item, mandatory: true }))
    ))
    formData.set('workers', JSON.stringify(
      workers.filter(w => w.workerName.trim())
    ))
    formData.set('pre_work_checklist_completed', allChecked ? 'true' : 'false')
    formData.set('checklist_items', JSON.stringify(checklist))

    const result = await action(formData)
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

          {/* ── Permit Details ── */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Permit Details
            </h2>

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

            <div style={{ marginBottom: '1rem' }}>
              <TextInput id="title" name="title" labelText="Title / Work Description (brief)"
                placeholder="e.g. Welding repair on vessel B-103" required />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <TextArea id="work_description" name="work_description" labelText="Detailed Work Description"
                rows={3} placeholder="Full description of the work to be performed…" required />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <TextInput id="exact_location" name="exact_location" labelText="Exact Location"
                placeholder="e.g. Level 2, Tank Farm, Grid B-4" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <TextInput id="valid_from" name="valid_from" labelText="Valid From" type="datetime-local" />
              <TextInput id="valid_until" name="valid_until" labelText="Valid Until" type="datetime-local"
                helperText={selectedType?.max_duration_hours ? `Max ${selectedType.max_duration_hours}h for this type` : undefined} />
            </div>

            {selectedType?.rescue_plan_required && (
              <TextArea id="rescue_plan" name="rescue_plan" labelText="Rescue Plan" rows={3}
                placeholder="Describe the rescue procedure if something goes wrong…" />
            )}
          </Tile>

          {/* ── Hazards Identified ── */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Hazards Identified
            </h2>

            {hazards.map((h, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                <TextInput
                  id={`hazard_desc_${i}`}
                  labelText={i === 0 ? 'Hazard Description' : ''}
                  placeholder="Describe the hazard…"
                  value={h.description}
                  onChange={e => updateHazard(i, 'description', e.target.value)}
                />
                <Select
                  id={`hazard_risk_${i}`}
                  labelText={i === 0 ? 'Risk Level' : ''}
                  value={h.riskLevel}
                  onChange={e => updateHazard(i, 'riskLevel', e.target.value)}
                >
                  {RISK_LEVELS.map(r => (
                    <SelectItem key={r} value={r} text={r.charAt(0).toUpperCase() + r.slice(1)} />
                  ))}
                </Select>
                <div style={{ paddingBottom: '0.125rem' }}>
                  <Button kind="danger--ghost" size="sm" onClick={() => removeHazard(i)}
                    disabled={hazards.length === 1}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <Button kind="ghost" size="sm"
              onClick={() => setHazards(prev => [...prev, { description: '', riskLevel: 'medium' }])}>
              + Add Hazard
            </Button>
          </Tile>

          {/* ── Control Measures ── */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Control Measures
            </h2>

            {controls.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                <Select
                  id={`control_type_${i}`}
                  labelText={i === 0 ? 'Control Type' : ''}
                  value={c.type}
                  onChange={e => updateControl(i, 'type', e.target.value)}
                >
                  {CONTROL_TYPES.map(t => (
                    <SelectItem key={t} value={t} text={t.charAt(0).toUpperCase() + t.slice(1)} />
                  ))}
                </Select>
                <TextInput
                  id={`control_desc_${i}`}
                  labelText={i === 0 ? 'Control Description' : ''}
                  placeholder="Describe the control measure…"
                  value={c.description}
                  onChange={e => updateControl(i, 'description', e.target.value)}
                />
                <div style={{ paddingBottom: '0.125rem' }}>
                  <Button kind="danger--ghost" size="sm" onClick={() => removeControl(i)}
                    disabled={controls.length === 1}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <Button kind="ghost" size="sm"
              onClick={() => setControls(prev => [...prev, { description: '', type: 'administrative' }])}>
              + Add Control
            </Button>
          </Tile>

          {/* ── PPE Requirements ── */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              PPE Requirements
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {PPE_ITEMS.map(item => (
                <Checkbox
                  key={item}
                  id={`ppe_${item.replace(/\s+/g, '_')}`}
                  labelText={item}
                  checked={selectedPPE.includes(item)}
                  onChange={() => togglePPE(item)}
                />
              ))}
            </div>

            {selectedPPE.filter(p => !PPE_ITEMS.includes(p)).length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {selectedPPE.filter(p => !PPE_ITEMS.includes(p)).map(p => (
                  <Tag key={p} type="blue" size="sm" style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedPPE(prev => prev.filter(i => i !== p))}>
                    {p} ×
                  </Tag>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <TextInput
                  id="custom_ppe"
                  labelText="Add Custom PPE Item"
                  placeholder="e.g. Chemical resistant suit"
                  value={customPPE}
                  onChange={e => setCustomPPE(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomPPE() } }}
                />
              </div>
              <Button kind="ghost" size="sm" onClick={addCustomPPE}>Add</Button>
            </div>
          </Tile>

          {/* ── Workers on Permit ── */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Workers on Permit
            </h2>

            {workers.map((w, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 160px auto', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                <Select
                  id={`worker_user_${i}`}
                  labelText={i === 0 ? 'System User (optional)' : ''}
                  value={w.workerId}
                  onChange={e => updateWorker(i, 'workerId', e.target.value)}
                >
                  <SelectItem value="" text="Contractor / External" />
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id} text={`${u.first_name} ${u.last_name}`} />
                  ))}
                </Select>
                <TextInput
                  id={`worker_name_${i}`}
                  labelText={i === 0 ? 'Full Name' : ''}
                  placeholder="Full name"
                  value={w.workerName}
                  onChange={e => updateWorker(i, 'workerName', e.target.value)}
                />
                <TextInput
                  id={`worker_role_${i}`}
                  labelText={i === 0 ? 'Role on Job' : ''}
                  placeholder="e.g. Welder"
                  value={w.role}
                  onChange={e => updateWorker(i, 'role', e.target.value)}
                />
                <div style={{ paddingBottom: '0.125rem' }}>
                  <Button kind="danger--ghost" size="sm" onClick={() => removeWorker(i)}
                    disabled={workers.length === 1}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <Button kind="ghost" size="sm"
              onClick={() => setWorkers(prev => [...prev, { workerId: '', workerName: '', role: '' }])}>
              + Add Worker
            </Button>
          </Tile>

          {/* ── Pre-Work Checklist ── */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Pre-Work Checklist
              </h2>
              {allChecked && (
                <Tag type="green" size="sm">All Verified</Tag>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {CHECKLIST_ITEMS.map(item => (
                <Checkbox
                  key={item}
                  id={`checklist_${item.replace(/\s+/g, '_')}`}
                  labelText={item}
                  checked={checklist.includes(item)}
                  onChange={() => toggleChecklist(item)}
                />
              ))}
            </div>

            {!allChecked && checklist.length > 0 && (
              <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '1rem' }}>
                {CHECKLIST_ITEMS.length - checklist.length} item(s) still pending
              </p>
            )}
          </Tile>

          {/* ── Isolation Requirements ── */}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Isolation Requirements
            </h2>
            <TextArea
              id="isolation_requirements"
              name="isolation_requirements"
              labelText="Isolation Requirements"
              rows={4}
              placeholder="Describe any isolation requirements, LOTO procedures, energy sources to be isolated…"
            />
          </Tile>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" kind="primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Permit'}
            </Button>
            <Button kind="secondary" href="/permits">Cancel</Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
