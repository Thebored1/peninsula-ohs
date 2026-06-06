'use client'

import { useState } from 'react'
import { TextArea, Button, InlineNotification } from '@carbon/react'
import { addSpeakUpResponse } from '@/app/actions/speak-up'

interface Props {
  reportId: string
}

export default function AddResponseForm({ reportId }: Props) {
  const [responseText, setResponseText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = responseText.trim()
    if (!trimmed) {
      setError('Response text is required.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('response_text', trimmed)
      const result = await addSpeakUpResponse(reportId, formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setResponseText('')
        window.location.reload()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          lowContrast
          style={{ marginBottom: '0.75rem' }}
          onCloseButtonClick={() => setError(null)}
        />
      )}
      <TextArea
        id="response-text"
        labelText="Add a response"
        placeholder="Write a response or update for this report…"
        rows={3}
        value={responseText}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResponseText(e.target.value)}
        disabled={submitting}
      />
      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          kind="primary"
          size="sm"
          type="submit"
          disabled={submitting || !responseText.trim()}
        >
          {submitting ? 'Submitting…' : 'Add Response'}
        </Button>
      </div>
    </form>
  )
}
