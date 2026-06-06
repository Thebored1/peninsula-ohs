'use client'

import { useState, useTransition } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  Form,
  InlineNotification,
} from '@carbon/react'
import { createRisk } from '@/app/actions/risks'

interface Category {
  id: string
  name: string
}

interface LevelOption {
  level_number: number
  name: string
  description?: string | null
}

interface UserOption {
  id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
}

interface ControlRow {
  id: string
  description: string
  control_type: string
  control_hierarchy: string
}

interface Props {
  categories: Category[]
  likelihoodLevels: LevelOption[]
  consequenceLevels: LevelOption[]
  users: UserOption[]
}

const HIERARCHY_OPTIONS = [
  { value: 'elimination',    label: 'Elimination' },
  { value: 'substitution',   label: 'Substitution' },
  { value: 'engineering',    label: 'Engineering' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'ppe',            label: 'PPE' },
]

const CONTROL_TYPE_OPTIONS = [
  { value: 'preventive',   label: 'Preventive' },
  { value: 'detective',    label: 'Detective' },
  { value: 'corrective',   label: 'Corrective' },
  { value: 'directive',    label: 'Directive' },
]

function getRiskLevel(score: number): { label: string; bg: string; color: string } {
  if (score <= 4)  return { label: 'Low',      bg: 'rgba(36,161,72,0.15)',  color: '#24a148' }
  if (score <= 9)  return { label: 'Medium',   bg: 'rgba(241,194,27,0.15)', color: '#b08800' }
  if (score <= 16) return { label: 'High',     bg: 'rgba(249,115,22,0.15)', color: '#c95000' }
  return               { label: 'Critical',  bg: 'rgba(218,30,40,0.15)',  color: '#da1e28' }
}

function getUserLabel(u: UserOption): string {
  return u.display_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.id
}

let _rowCounter = 0
function nextId() { return String(++_rowCounter) }

export default function RiskForm({ categories, likelihoodLevels, consequenceLevels, users }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Inherent risk
  const [likelihood, setLikelihood] = useState<number>(0)
  const [consequence, setConsequence] = useState<number>(0)

  // Residual risk
  const [residualLikelihood, setResidualLikelihood] = useState<number>(0)
  const [residualConsequence, setResidualConsequence] = useState<number>(0)

  // Dynamic control rows
  const [controls, setControls] = useState<ControlRow[]>([])

  const inherentScore = likelihood > 0 && consequence > 0 ? likelihood * consequence : null
  const riskLevel = inherentScore != null ? getRiskLevel(inherentScore) : null

  const residualScore = residualLikelihood > 0 && residualConsequence > 0
    ? residualLikelihood * residualConsequence
    : null
  const residualLevel = residualScore != null ? getRiskLevel(residualScore) : null

  function addControl() {
    setControls((prev) => [
      ...prev,
      { id: nextId(), description: '', control_type: 'preventive', control_hierarchy: 'administrative' },
    ])
  }

  function removeControl(id: string) {
    setControls((prev) => prev.filter((c) => c.id !== id))
  }

  function updateControl(id: string, field: keyof ControlRow, value: string) {
    setControls((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    // Serialise control rows into indexed hidden fields so the server action can read them
    controls.forEach((ctrl, i) => {
      formData.set(`control_description_${i}`, ctrl.description)
      formData.set(`control_type_${i}`, ctrl.control_type)
      formData.set(`control_hierarchy_${i}`, ctrl.control_hierarchy)
    })
    formData.set('controls_count', String(controls.length))

    startTransition(async () => {
      const result = await createRisk(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
          style={{ marginBottom: '1.5rem', maxWidth: '100%' }}
        />
      )}

      <Form onSubmit={handleSubmit}>
        <Grid>
          {/* Left — main fields */}
          <Column sm={4} md={8} lg={12}>

            {/* Basic Information */}
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Basic Information</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="title"
                      name="title"
                      labelText="Risk Title *"
                      placeholder="e.g. Working at height — roof access"
                      required
                    />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select
                      id="category_id"
                      name="category_id"
                      labelText="Category *"
                      defaultValue=""
                      required
                    >
                      <SelectItem value="" text="Select a category" />
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} text={cat.name} />
                      ))}
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select
                      id="risk_owner_id"
                      name="risk_owner_id"
                      labelText="Risk Owner"
                      defaultValue=""
                    >
                      <SelectItem value="" text="Unassigned" />
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id} text={getUserLabel(u)} />
                      ))}
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="location_activity"
                      name="location_activity"
                      labelText="Location / Activity"
                      placeholder="e.g. Warehouse rooftop, maintenance operations"
                    />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea
                      id="hazard_description"
                      name="hazard_description"
                      labelText="Hazard Description *"
                      placeholder="Describe the hazard, potential causes, and how harm could occur..."
                      rows={4}
                      required
                    />
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <TextInput
                      id="people_at_risk"
                      name="people_at_risk"
                      labelText="People at Risk"
                      placeholder="e.g. Workers, Visitors, Contractors"
                      helperText="Comma-separated, e.g. Workers, Visitors, Contractors"
                    />
                  </Column>
                </Grid>
              </div>
            </Tile>

            {/* Risk Assessment (Inherent) */}
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Risk Assessment (Inherent)</h2>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>
                  Rate the risk before any controls are applied.
                </p>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select
                      id="likelihood_score"
                      name="likelihood_score"
                      labelText="Likelihood *"
                      defaultValue=""
                      required
                      onChange={(e) => setLikelihood(parseInt(e.target.value, 10) || 0)}
                    >
                      <SelectItem value="" text="Select likelihood" />
                      {likelihoodLevels.map((l) => (
                        <SelectItem
                          key={l.level_number}
                          value={String(l.level_number)}
                          text={`${l.level_number} — ${l.name}`}
                        />
                      ))}
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select
                      id="consequence_score"
                      name="consequence_score"
                      labelText="Consequence *"
                      defaultValue=""
                      required
                      onChange={(e) => setConsequence(parseInt(e.target.value, 10) || 0)}
                    >
                      <SelectItem value="" text="Select consequence" />
                      {consequenceLevels.map((c) => (
                        <SelectItem
                          key={c.level_number}
                          value={String(c.level_number)}
                          text={`${c.level_number} — ${c.name}`}
                        />
                      ))}
                    </Select>
                  </Column>
                </Grid>

                {/* Live inherent score */}
                <div style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#f4f4f4',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.25rem' }}>Inherent Risk Score</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>
                      {inherentScore != null ? (
                        <span style={{ color: riskLevel?.color }}>
                          {likelihood} × {consequence} = {inherentScore}
                        </span>
                      ) : (
                        <span style={{ color: '#a8a8a8' }}>—</span>
                      )}
                    </p>
                  </div>
                  {riskLevel && inherentScore != null && (
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '2px',
                      backgroundColor: riskLevel.bg,
                      color: riskLevel.color,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}>
                      {riskLevel.label}
                    </span>
                  )}
                </div>
              </div>
            </Tile>

            {/* Control Measures */}
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Control Measures</h2>
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.125rem' }}>
                    List controls using the hierarchy of controls (most to least effective).
                  </p>
                </div>
                <Button
                  kind="ghost"
                  size="sm"
                  type="button"
                  onClick={addControl}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  + Add Control
                </Button>
              </div>
              <div style={{ padding: controls.length > 0 ? '0' : '2rem 1.5rem' }}>
                {controls.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                    No controls added. Click &quot;+ Add Control&quot; to begin.
                  </p>
                ) : (
                  controls.map((ctrl, i) => (
                    <div
                      key={ctrl.id}
                      style={{
                        padding: '1rem 1.5rem',
                        borderBottom: i < controls.length - 1 ? '1px solid #e0e0e0' : 'none',
                        backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{
                          minWidth: '1.5rem',
                          height: '1.5rem',
                          borderRadius: '50%',
                          backgroundColor: '#e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#525252',
                          flexShrink: 0,
                          marginTop: '0.25rem',
                        }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Grid condensed>
                            <Column sm={4} md={8} lg={16} style={{ marginBottom: '0.75rem' }}>
                              <TextInput
                                id={`ctrl_desc_${ctrl.id}`}
                                labelText="Control Description *"
                                placeholder="Describe the control measure..."
                                value={ctrl.description}
                                onChange={(e) => updateControl(ctrl.id, 'description', e.target.value)}
                                required={ctrl.description.trim() === '' ? false : undefined}
                              />
                            </Column>
                            <Column sm={4} md={4} lg={8} style={{ marginBottom: '0.25rem' }}>
                              <Select
                                id={`ctrl_hierarchy_${ctrl.id}`}
                                labelText="Hierarchy"
                                value={ctrl.control_hierarchy}
                                onChange={(e) => updateControl(ctrl.id, 'control_hierarchy', e.target.value)}
                              >
                                {HIERARCHY_OPTIONS.map((h) => (
                                  <SelectItem key={h.value} value={h.value} text={h.label} />
                                ))}
                              </Select>
                            </Column>
                            <Column sm={4} md={4} lg={8} style={{ marginBottom: '0.25rem' }}>
                              <Select
                                id={`ctrl_type_${ctrl.id}`}
                                labelText="Control Type"
                                value={ctrl.control_type}
                                onChange={(e) => updateControl(ctrl.id, 'control_type', e.target.value)}
                              >
                                {CONTROL_TYPE_OPTIONS.map((t) => (
                                  <SelectItem key={t.value} value={t.value} text={t.label} />
                                ))}
                              </Select>
                            </Column>
                          </Grid>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeControl(ctrl.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#da1e28',
                            fontSize: '1rem',
                            padding: '0.25rem',
                            flexShrink: 0,
                            marginTop: '0.25rem',
                          }}
                          aria-label="Remove control"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Tile>

            {/* Residual Risk Assessment */}
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Residual Risk (After Controls)</h2>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>
                  Rate the risk after all controls have been applied.
                </p>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select
                      id="residual_likelihood"
                      name="residual_likelihood"
                      labelText="Residual Likelihood"
                      defaultValue=""
                      onChange={(e) => setResidualLikelihood(parseInt(e.target.value, 10) || 0)}
                    >
                      <SelectItem value="" text="Select likelihood" />
                      <SelectItem value="1" text="1 — Rare" />
                      <SelectItem value="2" text="2 — Unlikely" />
                      <SelectItem value="3" text="3 — Possible" />
                      <SelectItem value="4" text="4 — Likely" />
                      <SelectItem value="5" text="5 — Almost Certain" />
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select
                      id="residual_consequence"
                      name="residual_consequence"
                      labelText="Residual Consequence"
                      defaultValue=""
                      onChange={(e) => setResidualConsequence(parseInt(e.target.value, 10) || 0)}
                    >
                      <SelectItem value="" text="Select consequence" />
                      <SelectItem value="1" text="1 — Insignificant" />
                      <SelectItem value="2" text="2 — Minor" />
                      <SelectItem value="3" text="3 — Moderate" />
                      <SelectItem value="4" text="4 — Major" />
                      <SelectItem value="5" text="5 — Catastrophic" />
                    </Select>
                  </Column>
                </Grid>

                {/* Live residual score */}
                <div style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  backgroundColor: residualLevel ? residualLevel.bg : '#f4f4f4',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: residualLevel ? `1px solid ${residualLevel.color}44` : '1px solid #e0e0e0',
                }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.25rem' }}>Residual Score</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>
                      {residualScore != null ? (
                        <span style={{ color: residualLevel?.color }}>
                          {residualLikelihood} × {residualConsequence} = {residualScore}
                        </span>
                      ) : (
                        <span style={{ color: '#a8a8a8' }}>—</span>
                      )}
                    </p>
                  </div>
                  {residualLevel && residualScore != null && (
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(255,255,255,0.6)',
                      color: residualLevel.color,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}>
                      {residualLevel.label}
                    </span>
                  )}
                  {inherentScore != null && residualScore != null && (
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>Risk reduction</p>
                      <p style={{ fontSize: '1rem', fontWeight: 600, color: residualScore < inherentScore ? '#24a148' : '#da1e28' }}>
                        {residualScore < inherentScore
                          ? `▼ ${inherentScore - residualScore} pts`
                          : residualScore === inherentScore
                            ? 'No change'
                            : `▲ ${residualScore - inherentScore} pts`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Tile>

            {/* Controls & Review */}
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Controls Summary & Review</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea
                      id="existing_controls_summary"
                      name="existing_controls_summary"
                      labelText="Existing Controls Summary"
                      placeholder="Describe the existing controls currently in place to manage this risk..."
                      rows={3}
                    />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select
                      id="review_frequency"
                      name="review_frequency"
                      labelText="Review Frequency"
                      defaultValue="quarterly"
                    >
                      <SelectItem value="monthly"   text="Monthly" />
                      <SelectItem value="quarterly" text="Quarterly" />
                      <SelectItem value="biannual"  text="Biannually (every 6 months)" />
                      <SelectItem value="annually"  text="Annually" />
                    </Select>
                  </Column>
                </Grid>
              </div>
            </Tile>

            {/* Additional Notes */}
            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Additional Notes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <TextArea
                  id="notes"
                  name="notes"
                  labelText="Notes (optional)"
                  placeholder="Any additional notes or context for this risk..."
                  rows={2}
                />
              </div>
            </Tile>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Risk'}
              </Button>
              <Button kind="ghost" href="/risks">
                Cancel
              </Button>
            </div>

          </Column>
        </Grid>
      </Form>
    </div>
  )
}
