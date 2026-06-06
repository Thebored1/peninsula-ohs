'use client'

import { useState } from 'react'
import { Button } from '@carbon/react'
import { cancelInvitation } from '@/app/actions/settings'

interface Props {
  invitationId: string
}

export default function CancelInvitationButton({ invitationId }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    setLoading(true)
    await cancelInvitation(invitationId)
    setLoading(false)
  }

  return (
    <Button
      kind="ghost"
      size="sm"
      disabled={loading}
      onClick={handleCancel}
    >
      {loading ? 'Cancelling…' : 'Cancel'}
    </Button>
  )
}
