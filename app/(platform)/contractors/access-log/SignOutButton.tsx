'use client'

import { useState, useTransition } from 'react'
import { signOutContractor } from '@/app/actions/contractors'

interface Props {
  accessLogId: string
}

export function SignOutButton({ accessLogId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleSignOut() {
    startTransition(async () => {
      await signOutContractor(accessLogId)
      setDone(true)
    })
  }

  if (done) return <span style={{ fontSize: '0.75rem', color: '#525252' }}>Signed out</span>

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      style={{
        fontSize: '0.75rem',
        color: '#da1e28',
        background: 'none',
        border: '1px solid #da1e28',
        borderRadius: '2px',
        padding: '0.25rem 0.5rem',
        cursor: isPending ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {isPending ? 'Signing out…' : 'Sign Out'}
    </button>
  )
}
