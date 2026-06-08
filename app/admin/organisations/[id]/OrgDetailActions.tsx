'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@carbon/react'
import { UserSimulation, Pause, Play } from '@carbon/icons-react'

interface Props {
  orgId: string
  orgName: string
  isActive: boolean
}

export default function OrgDetailActions({ orgId, orgName, isActive }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleToggleActive() {
    if (!confirm(`${isActive ? 'Suspend' : 'Activate'} ${orgName}?`)) return
    setLoading('toggle')
    setError(null)

    const res = await fetch(`/api/admin/organisations/${orgId}/toggle-active`, { method: 'POST' })
    const json = await res.json()
    setLoading(null)

    if (!res.ok) return setError(json.error ?? 'Failed')
    router.refresh()
  }

  async function handleImpersonate() {
    if (!confirm(`Impersonate ${orgName}? This will be logged.`)) return
    setLoading('impersonate')
    setError(null)

    const res = await fetch(`/api/admin/impersonate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, orgName }),
    })
    const json = await res.json()
    setLoading(null)

    if (!res.ok) return setError(json.error ?? 'Impersonation failed')

    // Follow the magic link — it completes the sign-in and lands on /dashboard
    window.location.href = json.actionLink
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={isActive ? Pause : Play}
          onClick={handleToggleActive}
          disabled={!!loading}
        >
          {loading === 'toggle' ? 'Updating…' : isActive ? 'Suspend' : 'Activate'}
        </Button>
        <Button
          kind="secondary"
          size="sm"
          renderIcon={UserSimulation}
          onClick={handleImpersonate}
          disabled={!!loading}
        >
          {loading === 'impersonate' ? 'Impersonating…' : 'Impersonate'}
        </Button>
      </div>
      {error && (
        <p style={{ fontSize: '0.75rem', color: '#fa4d56' }}>{error}</p>
      )}
    </div>
  )
}
