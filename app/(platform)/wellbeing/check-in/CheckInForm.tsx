'use client'

import { useState } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  TextArea,
  Select,
  SelectItem,
  Toggle,
  Form,
  FormGroup,
  InlineNotification,
  Tag,
} from '@carbon/react'
import { createWellbeingCheckIn } from '@/app/actions/wellbeing'

interface Site {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
}

interface Props {
  sites: Site[]
  departments: Department[]
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Moderate',
  4: 'Good',
  5: 'Excellent',
}

const MOOD_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
}

const STRESS_LABELS: Record<number, string> = {
  1: 'Minimal',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Very High',
}

const SCORE_COLORS: Record<number, { bg: string; border: string; color: string }> = {
  1: { bg: 'rgba(218,30,40,0.08)', border: '#da1e28', color: '#da1e28' },
  2: { bg: 'rgba(249,115,22,0.08)', border: '#f1620a', color: '#c95000' },
  3: { bg: 'rgba(241,194,27,0.08)', border: '#f1c21b', color: '#b08800' },
  4: { bg: 'rgba(36,161,72,0.08)', border: '#24a148', color: '#198038' },
  5: { bg: 'rgba(13,99,205,0.08)', border: '#0f62fe', color: '#0043ce' },
}

function ScoreSelector({
  id,
  name,
  label,
  description,
  labels,
  value,
  onChange,
}: {
  id: string
  name: string
  label: string
  description: string
  labels: Record<number, string>
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>
        {label}
      </p>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.75rem' }}>{description}</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = value === score
          const colors = SCORE_COLORS[score]
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.625rem 1rem',
                minWidth: '5rem',
                border: `2px solid ${selected ? colors.border : '#e0e0e0'}`,
                borderRadius: '4px',
                backgroundColor: selected ? colors.bg : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                gap: '0.25rem',
              }}
              aria-pressed={selected}
            >
              <span
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: selected ? colors.color : '#525252',
                  lineHeight: 1,
                }}
              >
                {score}
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  color: selected ? colors.color : '#6f6f6f',
                  fontWeight: selected ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {labels[score]}
              </span>
            </button>
          )
        })}
      </div>
      <input type="hidden" id={id} name={name} value={value} />
    </div>
  )
}

export function CheckInForm({ sites, departments }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moodScore, setMoodScore] = useState(3)
  const [stressLevel, setStressLevel] = useState(3)
  const [energyLevel, setEnergyLevel] = useState(3)
  const [workloadRating, setWorkloadRating] = useState(3)
  const [supportRequested, setSupportRequested] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('mood_score', String(moodScore))
      formData.set('stress_level', String(stressLevel))
      formData.set('energy_level', String(energyLevel))
      formData.set('workload_rating', String(workloadRating))
      formData.set('support_requested', String(supportRequested))
      const result = await createWellbeingCheckIn(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
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
          {/* Ratings */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  How are you feeling today?
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>
                  Rate each area from 1 (lowest) to 5 (highest)
                </p>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <ScoreSelector
                  id="mood_score_input"
                  name="mood_score_hidden"
                  label="Mood"
                  description="How would you rate your overall mood and emotional state?"
                  labels={MOOD_LABELS}
                  value={moodScore}
                  onChange={setMoodScore}
                />
                <ScoreSelector
                  id="stress_level_input"
                  name="stress_level_hidden"
                  label="Stress Level"
                  description="How stressed are you feeling? (1 = minimal stress, 5 = very high stress)"
                  labels={STRESS_LABELS}
                  value={stressLevel}
                  onChange={setStressLevel}
                />
                <ScoreSelector
                  id="energy_level_input"
                  name="energy_level_hidden"
                  label="Energy Level"
                  description="How would you rate your physical and mental energy today?"
                  labels={SCORE_LABELS}
                  value={energyLevel}
                  onChange={setEnergyLevel}
                />
                <ScoreSelector
                  id="workload_rating_input"
                  name="workload_rating_hidden"
                  label="Workload"
                  description="How manageable is your current workload feeling? (1 = overwhelming, 5 = very manageable)"
                  labels={SCORE_LABELS}
                  value={workloadRating}
                  onChange={setWorkloadRating}
                />
              </div>
            </Tile>
          </Column>

          {/* Optional details */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Additional Details
                  <Tag type="gray" size="sm" style={{ marginLeft: '0.5rem' }}>Optional</Tag>
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextArea
                        id="free_text"
                        name="free_text"
                        labelText="Comments (anonymous)"
                        placeholder="Anything you'd like to share about how you're feeling or what's affecting your wellbeing? (completely anonymous)"
                        rows={4}
                      />
                    </FormGroup>
                  </Column>

                  {sites.length > 0 && (
                    <Column sm={4} md={4} lg={8}>
                      <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                        <Select id="site_id" name="site_id" labelText="Site (optional)">
                          <SelectItem value="" text="No site selected" />
                          {sites.map((s) => (
                            <SelectItem key={s.id} value={s.id} text={s.name} />
                          ))}
                        </Select>
                      </FormGroup>
                    </Column>
                  )}

                  {departments.length > 0 && (
                    <Column sm={4} md={4} lg={8}>
                      <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                        <Select id="department_id" name="department_id" labelText="Department (optional)">
                          <SelectItem value="" text="No department selected" />
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id} text={d.name} />
                          ))}
                        </Select>
                      </FormGroup>
                    </Column>
                  )}

                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '0' }}>
                      <div
                        style={{
                          padding: '1rem',
                          border: supportRequested ? '1px solid #da1e28' : '1px solid #e0e0e0',
                          borderRadius: '4px',
                          backgroundColor: supportRequested ? 'rgba(218,30,40,0.04)' : '#fafafa',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>
                          Would you like someone to reach out?
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.75rem' }}>
                          If you&apos;d like support, enabling this will flag your check-in for HR follow-up. Note: flagging may reduce anonymity.
                        </p>
                        <Toggle
                          id="support_requested_toggle"
                          labelA="No, I&apos;m fine"
                          labelB="Yes, please reach out"
                          toggled={supportRequested}
                          onToggle={(checked: boolean) => setSupportRequested(checked)}
                          hideLabel
                        />
                      </div>
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Summary preview */}
          <Column sm={4} md={8} lg={12}>
            <Tile
              style={{
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
                backgroundColor: '#f4f4f4',
                border: '1px solid #e0e0e0',
              }}
            >
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#525252', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.32px' }}>
                Summary
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.125rem' }}>Mood</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 600, color: SCORE_COLORS[moodScore]?.color ?? '#161616' }}>{moodScore}/5</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.125rem' }}>Stress</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 600, color: SCORE_COLORS[stressLevel]?.color ?? '#161616' }}>{stressLevel}/5</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.125rem' }}>Energy</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 600, color: SCORE_COLORS[energyLevel]?.color ?? '#161616' }}>{energyLevel}/5</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.125rem' }}>Workload</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 600, color: SCORE_COLORS[workloadRating]?.color ?? '#161616' }}>{workloadRating}/5</p>
                </div>
                {supportRequested && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Tag type="red" size="sm">Support Requested</Tag>
                  </div>
                )}
              </div>
            </Tile>
          </Column>

          {/* Actions */}
          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Check-In'}
              </Button>
              <Button kind="ghost" href="/wellbeing">
                Cancel
              </Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
