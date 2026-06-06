'use client'

import { useState } from 'react'
import { TextArea, Button, InlineNotification } from '@carbon/react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  actionId: string
}

export default function AddCommentForm({ actionId }: Props) {
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const trimmed = body.trim()
    if (!trimmed) {
      setError('Comment body is required.')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('You must be signed in to comment.')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organisation_id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setError('User profile not found.')
        return
      }

      const { error: insertError } = await supabase.from('action_comments').insert({
        action_id: actionId,
        organisation_id: profile.organisation_id,
        user_id: user.id,
        comment_type: 'note',
        body: trimmed,
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      setBody('')
      setSuccess(true)
      // Reload to show the new comment
      window.location.reload()
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
        id="comment-body"
        labelText="Add a comment"
        placeholder="Write a note or update..."
        rows={3}
        value={body}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
        disabled={submitting}
      />
      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          kind="primary"
          size="sm"
          type="submit"
          disabled={submitting || !body.trim()}
        >
          {submitting ? 'Submitting…' : 'Add Comment'}
        </Button>
      </div>
    </form>
  )
}
