'use client'

import { useState, useTransition } from 'react'
import {
  TextInput, Form, InlineNotification, Modal, Select, SelectItem, FormGroup,
} from '@carbon/react'
import { signInContractor } from '@/app/actions/contractors'

interface Worker {
  id: string
  first_name: string
  last_name: string
  role?: string | null
}

interface Site {
  id: string
  name: string
}

interface Props {
  contractorId: string
  workers: Worker[]
  sites: Site[]
}

export function SignInPanel({ contractorId, workers, sites }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await signInContractor(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
        }, 1200)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontSize: '0.875rem',
          color: '#24a148',
          background: 'none',
          border: '1px solid #24a148',
          borderRadius: '2px',
          padding: '0.25rem 0.625rem',
          cursor: 'pointer',
        }}
      >
        Sign In Worker
      </button>

      <Modal
        open={open}
        modalHeading="Sign In Contractor Worker"
        primaryButtonText={isPending ? 'Signing In…' : 'Sign In'}
        secondaryButtonText="Cancel"
        onRequestClose={() => setOpen(false)}
        onSecondarySubmit={() => setOpen(false)}
        onRequestSubmit={() => {
          const form = document.getElementById('sign-in-form') as HTMLFormElement | null
          form?.requestSubmit()
        }}
        primaryButtonDisabled={isPending}
        size="sm"
      >
        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
            style={{ marginBottom: '1rem' }}
          />
        )}
        {success && (
          <InlineNotification
            kind="success"
            title="Worker signed in"
            style={{ marginBottom: '1rem' }}
          />
        )}
        <Form id="sign-in-form" onSubmit={handleSubmit}>
          <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
            <Select id="si_worker" name="contractor_worker_id" labelText="Worker *" defaultValue="" required>
              <SelectItem value="" text="Select worker…" />
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id} text={`${w.first_name} ${w.last_name}${w.role ? ` — ${w.role}` : ''}`} />
              ))}
            </Select>
          </FormGroup>
          <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
            <Select id="si_site" name="site_id" labelText="Site" defaultValue="">
              <SelectItem value="" text="Select site…" />
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id} text={s.name} />
              ))}
            </Select>
          </FormGroup>
          <TextInput id="si_purpose" name="purpose" labelText="Purpose / Work Description" />
        </Form>
      </Modal>
    </>
  )
}
