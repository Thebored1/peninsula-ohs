'use client'

import { useState } from 'react'
import {
  Grid,
  Column,
  Tile,
  Button,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  Toggle,
  FormGroup,
  InlineNotification,
  InlineLoading,
  Tag,
} from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'
import { createReviewWorkflow } from '@/app/actions/documents'

interface Role {
  id: string
  name: string
}

interface WorkflowStep {
  stepName: string
  stepType: 'reviewer' | 'approver' | 'notified'
  assignedRoleId: string
}

interface Props {
  roles: Role[]
}

const STEP_TYPE_OPTIONS: { value: WorkflowStep['stepType']; label: string }[] = [
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'approver', label: 'Approver' },
  { value: 'notified', label: 'Notified' },
]

function emptyStep(): WorkflowStep {
  return { stepName: '', stepType: 'reviewer', assignedRoleId: '' }
}

export function WorkflowForm({ roles }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDefault, setIsDefault] = useState(false)
  const [steps, setSteps] = useState<WorkflowStep[]>([emptyStep()])

  function updateStep(index: number, patch: Partial<WorkflowStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()])
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const name = (formData.get('name') as string)?.trim()
    if (!name) {
      setError('Workflow name is required.')
      return
    }
    if (steps.length === 0) {
      setError('At least one review step is required.')
      return
    }
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].stepName.trim()) {
        setError(`Step ${i + 1} must have a name.`)
        return
      }
    }

    formData.set('is_default', isDefault ? 'true' : 'false')
    formData.set(
      'steps',
      JSON.stringify(
        steps.map((s) => ({
          step_name: s.stepName,
          step_type: s.stepType,
          assigned_role_id: s.assignedRoleId || undefined,
        }))
      )
    )

    setLoading(true)
    const result = await createReviewWorkflow(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success the action redirects to /documents/workflows
  }

  return (
    <form onSubmit={handleSubmit}>
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

      <Grid condensed>
        {/* Workflow Details tile */}
        <Column sm={4} md={8} lg={10}>
          <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Workflow Details
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={8} lg={16}>
                  <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                    <TextInput
                      id="name"
                      name="name"
                      labelText="Workflow Name *"
                      placeholder="e.g. Standard Document Review"
                      required
                    />
                  </FormGroup>
                </Column>
                <Column sm={4} md={8} lg={16}>
                  <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                    <TextArea
                      id="description"
                      name="description"
                      labelText="Description"
                      placeholder="Describe when this workflow should be used…"
                      rows={3}
                    />
                  </FormGroup>
                </Column>
                <Column sm={4} md={8} lg={16}>
                  <Toggle
                    id="is_default"
                    labelText="Set as default workflow for new documents"
                    toggled={isDefault}
                    onToggle={(checked: boolean) => setIsDefault(checked)}
                    size="sm"
                  />
                </Column>
              </Grid>
            </div>
          </Tile>

          {/* Review Steps tile */}
          <Tile style={{ padding: 0, marginBottom: '1.5rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Review Steps
              </h2>
              <Button
                kind="ghost"
                size="sm"
                renderIcon={Add}
                onClick={addStep}
                type="button"
              >
                Add Step
              </Button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {steps.length === 0 && (
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f', marginBottom: '1rem' }}>
                  No steps added yet. Click &ldquo;Add Step&rdquo; to begin.
                </p>
              )}
              {steps.map((step, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-end',
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom:
                      index < steps.length - 1 ? '1px solid #e0e0e0' : 'none',
                  }}
                >
                  {/* Step number badge */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      background: '#0f62fe',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Step name */}
                  <div style={{ flex: 2, minWidth: 0 }}>
                    <TextInput
                      id={`step-name-${index}`}
                      labelText="Step Name *"
                      value={step.stepName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateStep(index, { stepName: e.target.value })
                      }
                      placeholder="e.g. Manager Review"
                      size="md"
                    />
                  </div>

                  {/* Step type */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Select
                      id={`step-type-${index}`}
                      labelText="Type"
                      value={step.stepType}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        updateStep(index, {
                          stepType: e.target.value as WorkflowStep['stepType'],
                        })
                      }
                    >
                      {STEP_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} text={opt.label} />
                      ))}
                    </Select>
                  </div>

                  {/* Role */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Select
                      id={`step-role-${index}`}
                      labelText="Assigned Role"
                      value={step.assignedRoleId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        updateStep(index, { assignedRoleId: e.target.value })
                      }
                    >
                      <SelectItem value="" text="— Any —" />
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id} text={r.name} />
                      ))}
                    </Select>
                  </div>

                  {/* Remove button */}
                  <div style={{ flexShrink: 0 }}>
                    <Button
                      kind="ghost"
                      size="md"
                      renderIcon={TrashCan}
                      iconDescription="Remove step"
                      hasIconOnly
                      onClick={() => removeStep(index)}
                      type="button"
                      disabled={steps.length === 1}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Tile>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {loading ? (
              <InlineLoading description="Saving…" />
            ) : (
              <Button kind="primary" type="submit">
                Create Workflow
              </Button>
            )}
            <Button kind="ghost" href="/documents/workflows" type="button">
              Cancel
            </Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
