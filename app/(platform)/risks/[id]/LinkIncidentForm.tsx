'use client'

import { useState, useTransition } from 'react'
import { TextInput, Button, InlineNotification } from '@carbon/react'
import { linkIncidentToRisk } from '@/app/actions/risks'

interface Props {
  riskId: string
}

export default function LinkIncidentForm({ riskId }: Props) {
  const [incidentRef, setIncidentRef] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!incidentRef.trim()) return
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.set('risk_id', riskId)
    formData.set('incident_ref', incidentRef.trim())

    startTransition(async () => {
      const result = await linkIncidentToRisk(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess('Incident linked successfully.')
        setIncidentRef('')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
          style={{ marginBottom: '0.5rem', maxWidth: '100%' }}
          lowContrast
        />
      )}
      {success && (
        <InlineNotification
          kind="success"
          title="Done"
          subtitle={success}
          onCloseButtonClick={() => setSuccess(null)}
          style={{ marginBottom: '0.5rem', maxWidth: '100%' }}
          lowContrast
        />
      )}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <TextInput
            id="incident_ref"
            name="incident_ref"
            labelText=""
            hideLabel
            placeholder="Incident number or ID (e.g. INC-0042)"
            value={incidentRef}
            onChange={(e) => setIncidentRef(e.target.value)}
            size="sm"
          />
        </div>
        <Button
          type="submit"
          kind="secondary"
          size="sm"
          disabled={isPending || !incidentRef.trim()}
        >
          {isPending ? 'Linking...' : 'Link'}
        </Button>
      </div>
    </form>
  )
}
