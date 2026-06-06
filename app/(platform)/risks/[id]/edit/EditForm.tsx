'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, InlineNotification,
} from '@carbon/react'
import { updateRisk } from '@/app/actions/risks'

interface Category { id: string; name: string }
interface LevelOption { level_number: number; name: string }

interface InitialData {
  title: string
  category_id: string | null
  hazard_description: string
  location_activity: string | null
  people_at_risk: string[] | null
  likelihood_score: number
  consequence_score: number
  existing_controls_summary: string | null
  review_frequency: string | null
  notes: string | null
}

interface Props {
  id: string
  initialData: InitialData
  categories: Category[]
  likelihoodLevels: LevelOption[]
  consequenceLevels: LevelOption[]
}

function getRiskLevel(score: number) {
  if (score <= 4)  return { label: 'Low',     color: '#24a148' }
  if (score <= 9)  return { label: 'Medium',  color: '#b08800' }
  if (score <= 16) return { label: 'High',    color: '#c95000' }
  return               { label: 'Critical', color: '#da1e28' }
}

export function EditRiskForm({ id, initialData, categories, likelihoodLevels, consequenceLevels }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [likelihood, setLikelihood] = useState(initialData.likelihood_score)
  const [consequence, setConsequence] = useState(initialData.consequence_score)

  const score = likelihood > 0 && consequence > 0 ? likelihood * consequence : null
  const level = score != null ? getRiskLevel(score) : null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateRisk(id, formData)
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
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Basic Information</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput id="title" name="title" labelText="Risk Title *" defaultValue={initialData.title} required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select id="category_id" name="category_id" labelText="Category *" defaultValue={initialData.category_id ?? ''} required>
                      <SelectItem value="" text="Select a category" />
                      {categories.map((c) => <SelectItem key={c.id} value={c.id} text={c.name} />)}
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="location_activity" name="location_activity" labelText="Location / Activity" defaultValue={initialData.location_activity ?? ''} />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="hazard_description" name="hazard_description" labelText="Hazard Description *" defaultValue={initialData.hazard_description} rows={4} required />
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <TextInput id="people_at_risk" name="people_at_risk" labelText="People at Risk" defaultValue={(initialData.people_at_risk ?? []).join(', ')} helperText="Comma-separated" />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Risk Assessment (Inherent)</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select id="likelihood_score" name="likelihood_score" labelText="Likelihood *" defaultValue={String(initialData.likelihood_score)} required onChange={(e) => setLikelihood(parseInt(e.target.value, 10) || 0)}>
                      <SelectItem value="" text="Select likelihood" />
                      {likelihoodLevels.map((l) => <SelectItem key={l.level_number} value={String(l.level_number)} text={`${l.level_number} — ${l.name}`} />)}
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <Select id="consequence_score" name="consequence_score" labelText="Consequence *" defaultValue={String(initialData.consequence_score)} required onChange={(e) => setConsequence(parseInt(e.target.value, 10) || 0)}>
                      <SelectItem value="" text="Select consequence" />
                      {consequenceLevels.map((c) => <SelectItem key={c.level_number} value={String(c.level_number)} text={`${c.level_number} — ${c.name}`} />)}
                    </Select>
                  </Column>
                </Grid>
                <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: '#f4f4f4', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.25rem' }}>Inherent Risk Score</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 300, lineHeight: 1, color: level?.color ?? '#161616' }}>
                      {score != null ? `${likelihood} × ${consequence} = ${score}` : <span style={{ color: '#a8a8a8' }}>—</span>}
                    </p>
                  </div>
                  {level && score != null && (
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '2px', backgroundColor: `${level.color}22`, color: level.color, fontSize: '0.875rem', fontWeight: 600 }}>
                      {level.label}
                    </span>
                  )}
                </div>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Controls &amp; Review</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="existing_controls_summary" name="existing_controls_summary" labelText="Existing Controls" defaultValue={initialData.existing_controls_summary ?? ''} rows={3} />
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <Select id="review_frequency" name="review_frequency" labelText="Review Frequency" defaultValue={initialData.review_frequency ?? 'quarterly'}>
                      <SelectItem value="monthly" text="Monthly" />
                      <SelectItem value="quarterly" text="Quarterly" />
                      <SelectItem value="biannual" text="Biannually" />
                      <SelectItem value="annually" text="Annually" />
                    </Select>
                  </Column>
                </Grid>
              </div>
            </Tile>

            <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Additional Notes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <TextArea id="notes" name="notes" labelText="Notes (optional)" defaultValue={initialData.notes ?? ''} rows={2} />
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Changes'}</Button>
              <Button kind="ghost" href={`/risks/${id}`}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
