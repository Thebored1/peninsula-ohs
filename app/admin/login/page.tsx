'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, Stack, TextInput, PasswordInput, InlineNotification, Tile } from '@carbon/react'
import { ArrowRight } from '@carbon/icons-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Login failed')
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#161616',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '40px', height: '40px', backgroundColor: '#da1e28', borderRadius: '2px',
            margin: '0 auto 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f4f4f4' }}>Lumis Admin</h1>
          <p style={{ fontSize: '0.875rem', color: '#8d8d8d', marginTop: '0.25rem' }}>Internal access only</p>
        </div>

        <Tile style={{ padding: '2rem', backgroundColor: '#262626' }}>
          {error && (
            <InlineNotification
              kind="error" title="" subtitle={error} lowContrast
              onCloseButtonClick={() => setError(null)}
              style={{ marginBottom: '1.5rem', maxWidth: '100%' }}
            />
          )}
          <Form onSubmit={handleSubmit}>
            <Stack gap={5}>
              <TextInput
                id="email" labelText="Email" type="email" placeholder="admin@lumis.app"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus
              />
              <PasswordInput
                id="password" labelText="Password"
                value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" renderIcon={ArrowRight} disabled={loading} style={{ width: '100%', maxWidth: '100%' }}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </Form>
        </Tile>
      </div>
    </div>
  )
}
