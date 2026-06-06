'use client'

import { useState } from 'react'
import {
  Button,
  TextInput,
  Select,
  SelectItem,
  InlineNotification,
} from '@carbon/react'
import { inviteUser } from '@/app/actions/settings'

interface Role {
  id: string
  name: string
}

interface Props {
  roles: Role[]
}

export default function InviteUserForm({ roles }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)

    const fd = new FormData(e.currentTarget)

    try {
      const result = await inviteUser(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        ;(e.target as HTMLFormElement).reset()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          lowContrast
          style={{ marginBottom: '1rem' }}
          onCloseButtonClick={() => setError(null)}
        />
      )}
      {success && (
        <InlineNotification
          kind="success"
          title="Invitation sent"
          subtitle="The user will receive an email invitation."
          lowContrast
          style={{ marginBottom: '1rem' }}
          onCloseButtonClick={() => setSuccess(false)}
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
        <TextInput
          id="invite-email"
          name="email"
          labelText="Email address"
          placeholder="colleague@example.com"
          type="email"
          disabled={submitting}
        />
        <Select
          id="invite-role"
          name="role_id"
          labelText="Role (optional)"
          disabled={submitting}
        >
          <SelectItem value="" text="No role" />
          {roles.map((r) => (
            <SelectItem key={r.id} value={r.id} text={r.name} />
          ))}
        </Select>
        <Button type="submit" kind="primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send Invitation'}
        </Button>
      </div>
    </form>
  )
}
