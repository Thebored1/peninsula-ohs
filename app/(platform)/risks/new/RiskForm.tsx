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

interface Props {
  categories: Category[]
  likelihoodLevels: LevelOption[]
  consequenceLevels: LevelOption[]
}

function getRiskLevel(score: number): { label: string; bg: string; color: string } {
  if (score <= 4)  return { label: 'Low',      bg: 'rgba(36,161,72,0.15)',  color: '#24a148' }
  if (score <= 9)  return { label: 'Medium',   bg: 'rgba(241,194,27,0.15)', color: '#b08800' }
  if (score <= 16) return { label: 'High',     bg: 'rgba(249,115,22,0.15)', color: '#c95000' }
  return               { label: 'Critical',  bg: 'rgba(218,30,40,0.15)',  color: '#da1e28' }
}

export default function RiskForm({ categories, likelihoodLevels, consequenceLevels }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [likelihood, setLikelihood] = useState<number>(0)
  const [consequence, setConsequence] = useState<number>(0)

  const inherentScore = likelihood > 0 && consequence > 0 ? likelihood * consequence : null
  const riskLevel = inherentScore != null ? getRiskLevel(inherentScore) : null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
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

            {/* Risk Assessment */}
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

                {/* Live score calculation */}
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

            {/* Controls & Review */}
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Controls & Review</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea
                      id="existing_controls_summary"
                      name="existing_controls_summary"
                      labelText="Existing Controls"
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
