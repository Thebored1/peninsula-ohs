'use client'

import { useState } from 'react'
import {
  Select,
  SelectItem,
  FormGroup,
  Button,
  InlineNotification,
  InlineLoading,
} from '@carbon/react'
import { updateDocumentSettings } from '@/app/actions/documents'

interface Props {
  orgId: string
  currentMethod: string
}

const SIGNATURE_METHOD_OPTIONS = [
  { value: 'either', label: 'Either — worker can choose' },
  { value: 'draw', label: 'Draw signature only' },
  { value: 'type', label: 'Type name only' },
]

export function DocumentSettingsForm({ orgId, currentMethod }: Props) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState(currentMethod)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('org_id', orgId)

    const result = await updateDocumentSettings(formData)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
            lowContrast
          />
        </div>
      )}
      {success && (
        <div style={{ marginBottom: '1rem' }}>
          <InlineNotification
            kind="success"
            title="Saved"
            subtitle="Document settings updated successfully."
            onCloseButtonClick={() => setSuccess(false)}
            lowContrast
          />
        </div>
      )}

      <FormGroup legendText="" style={{ marginBottom: '1.5rem' }}>
        <Select
          id="required_signature_method"
          name="required_signature_method"
          labelText="Required Signature Method"
          value={method}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMethod(e.target.value)}
        >
          {SIGNATURE_METHOD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} text={opt.label} />
          ))}
        </Select>
      </FormGroup>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        {loading ? (
          <InlineLoading description="Saving…" />
        ) : (
          <Button kind="primary" type="submit">
            Save Changes
          </Button>
        )}
      </div>
    </form>
  )
}
